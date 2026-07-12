from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from uuid import UUID

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.exceptions import (
    ConflictError,
    ExternalServiceError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
)
from config.service import get_config
from google_health.const import GOOGLE_AUTH_URL, GOOGLE_TOKEN_URL
from google_health.google_client import google_health_client, hooked_client
from google_health.schema import ExerciseDataPoint, TokenResponse
from google_health.util import decrypt_token, encrypt_token
from models.integration import Integration, IntegrationProvider
from models.workout_log import WorkoutLog
from workout_log.service import get_todays_workout_logs
from workout_log.summary import workout_summary

MANUAL_CREATE_DELAY = timedelta(hours=2)

LOG = get_logger()


async def list_datapoints(db: AsyncSession, user_id: UUID) -> list[ExerciseDataPoint]:
    integration = await get_user_integration(db, user_id)
    if integration is None:
        raise NotFoundError("Google Health integration not found")

    access = await _get_access_token(db, user_id)
    async with google_health_client(access) as gh:
        day_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        return await gh.list_datapoints(since=day_start)


async def users_to_sync(db: AsyncSession) -> list[UUID]:
    req = await db.execute(
        select(WorkoutLog.user_id)
        .join(Integration, WorkoutLog.user_id == Integration.user_id)
        .where(Integration.provider == IntegrationProvider.GOOGLE_HEALTH)
        .where(WorkoutLog.synchronized.is_(None))
        .distinct()
    )
    user_ids = list(req.scalars().all())
    LOG.info("users_to_sync", count=len(user_ids))
    return user_ids


async def sync_user(db: AsyncSession, user_id: UUID) -> int:
    logger = LOG.bind(user_id=str(user_id))
    integration = await get_user_integration(db, user_id)
    if integration is None:
        raise NotFoundError("Google Health integration not found")

    workouts = await get_todays_workout_logs(db, user_id)
    if len(workouts) < 1:
        return 0

    access_token = await _get_access_token(db, user_id)
    async with google_health_client(access_token) as gh:
        day_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        datapoints = await gh.list_datapoints(since=day_start)

        workout_to_sync, datapoints_to_sync = _filter_synced(workouts, datapoints)
        workout_to_sync.sort(key=lambda w: w.completed_at or w.started_at)
        datapoints_to_sync.sort(key=lambda d: d.exercise.interval.start_time)

        synced_count = 0
        matched = min(len(workout_to_sync), len(datapoints_to_sync))
        for workout_log, datapoint in zip(workout_to_sync, datapoints_to_sync, strict=True):
            summary = workout_summary(workout_log.sets)
            existing_notes = datapoint.exercise.notes
            notes = f"{existing_notes}\n\n{summary}" if existing_notes else summary
            await gh.update_datapoint_notes(datapoint, notes)
            workout_log.sync_datapoint_name = datapoint.name
            await db.flush()
            synced_count += 1

        now = datetime.now(UTC)
        created_count = 0
        for workout_log in workout_to_sync[matched:]:
            if workout_log.completed_at is None:
                raise ValidationError("completed_at missing in WorkoutLog")
            finished_at = workout_log.completed_at
            if now - finished_at < MANUAL_CREATE_DELAY:
                logger.debug("datapoint_creation_treshold_not_reached")
                continue
            summary = workout_summary(workout_log.sets)
            datapoint = await gh.create_datapoint(workout_log, summary)
            workout_log.sync_datapoint_name = datapoint.name
            created_count += 1
        await db.flush()

        LOG.info("user_sync_completed", updated=synced_count, created=created_count)
        return synced_count


async def revoke_integration(db: AsyncSession, user_id: UUID):
    req = await db.execute(select(Integration).where(Integration.user_id == user_id))
    existing = req.scalar_one_or_none()
    if existing is None:
        raise NotFoundError("Integration not found")
    await db.delete(existing)
    await db.flush()
    LOG.info("google_health_integration_revoked", user_id=str(user_id))


async def get_user_integration(db: AsyncSession, user_id: UUID) -> Integration | None:
    req = await db.execute(select(Integration).where(Integration.user_id == user_id))
    return req.scalar_one_or_none()


def build_google_health_url(state: str) -> str:
    cfg = get_config().google_oauth_config
    params = {
        "client_id": cfg.google_client_id,
        "redirect_uri": cfg.google_health_redirect_uri,
        "response_type": "code",
        "scope": " ".join(
            [
                "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
                "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.writeonly",
            ]
        ),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def handle_integration_callback(db: AsyncSession, user_id: UUID, code: str):
    existing = await db.execute(
        select(Integration).where(
            Integration.user_id == user_id,
            Integration.provider == IntegrationProvider.GOOGLE_HEALTH,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("Integration already exists")

    token_res = await exchange_code(code)
    if token_res.refresh_token is None:
        raise ExternalServiceError("Refresh token not received")
    encrypted = encrypt_token(token_res.refresh_token)
    integration = Integration(
        user_id=user_id,
        provider=IntegrationProvider.GOOGLE_HEALTH,
        encrypted_refresh_token=encrypted,
        scope_granted=token_res.scope,
    )
    db.add(integration)
    await db.flush()
    LOG.info("integration_created", integration_id=integration.id, user_id=str(user_id))


async def _get_access_token(db: AsyncSession, user_id: UUID) -> str:
    req = await db.execute(select(Integration).where(Integration.user_id == user_id))
    integration = req.scalar_one_or_none()
    if integration is None:
        raise NotFoundError("Integration not found")
    decrypted = decrypt_token(integration.encrypted_refresh_token)

    cfg = get_config().google_oauth_config
    async with hooked_client(raise_on_error=False) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": cfg.google_client_id,
                "client_secret": cfg.google_client_secret,
                "refresh_token": decrypted,
                "grant_type": "refresh_token",
            },
        )
        if resp.status_code == status.HTTP_401_UNAUTHORIZED:
            await db.delete(integration)
            await db.flush()
            LOG.warning("google_grant_revoked", user_id=str(user_id))
            raise UnauthorizedError("Grant revoked")
        resp.raise_for_status()
        body = TokenResponse.model_validate(resp.json())
        if body.refresh_token is not None:
            integration.encrypted_refresh_token = encrypt_token(body.refresh_token)
            await db.flush()
        return body.access_token


async def exchange_code(code: str) -> TokenResponse:
    cfg = get_config().google_oauth_config
    async with hooked_client(raise_on_error=False) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": cfg.google_client_id,
                "client_secret": cfg.google_client_secret,
                "redirect_uri": cfg.google_health_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if resp.status_code == status.HTTP_401_UNAUTHORIZED:
            raise UnauthorizedError("Grant revoked")
        resp.raise_for_status()
        body = resp.json()
        return TokenResponse.model_validate(body)


def _filter_synced(
    workouts: list[WorkoutLog], datapoints: list[ExerciseDataPoint]
) -> tuple[list[WorkoutLog], list[ExerciseDataPoint]]:
    already_synced_names = {
        w.sync_datapoint_name for w in workouts if w.sync_datapoint_name is not None
    }
    unsynced_workouts = [w for w in workouts if w.sync_datapoint_name is None]
    unsynced_datapoints = [dp for dp in datapoints if dp.name not in already_synced_names]
    return unsynced_workouts, unsynced_datapoints
