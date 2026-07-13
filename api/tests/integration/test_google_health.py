import secrets
from datetime import UTC, datetime, timedelta

import pytest_asyncio
import respx
from fastapi import status
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from google_health.const import (
    GOOGLE_DATA_POINTS_URL,
    GOOGLE_HEALTH_API_URL,
    GOOGLE_TOKEN_URL,
)
from google_health.google_client import STRENGTH_TRAINING_EXERCISE_TYPE
from google_health.service import sync_user
from google_health.util import decrypt_token, encrypt_token
from models.exercise import Exercise, ExerciseCategory
from models.integration import Integration, IntegrationProvider
from models.set_log import SetLog
from models.user import User
from models.workout_log import WorkoutLog, WorkoutLogStatus

CALLBACK_URL = "/api/integrations/google-health/google/callback"
WORKOUTS_URL = "/api/integrations/google-health/workouts"
DATAPOINTS_URL = f"{GOOGLE_HEALTH_API_URL}{GOOGLE_DATA_POINTS_URL}"


@pytest_asyncio.fixture
async def integration(db_session: AsyncSession, user: User) -> Integration:
    obj = Integration(
        user_id=user.id,
        provider=IntegrationProvider.GOOGLE_HEALTH,
        encrypted_refresh_token=encrypt_token("stored-refresh-token"),
        scope_granted="activity_and_fitness.readonly",
    )
    db_session.add(obj)
    await db_session.flush()
    return obj


def _mock_token_endpoint(refresh_token: str | None = None) -> respx.Route:
    body = {
        "access_token": secrets.token_urlsafe(16),
        "scope": "activity_and_fitness.readonly",
        "expires_in": 3600,
        "token_type": "Bearer",
    }
    if refresh_token is not None:
        body["refresh_token"] = refresh_token
    return respx.post(GOOGLE_TOKEN_URL).respond(json=body)


async def _get_integration(db: AsyncSession, user: User) -> Integration | None:
    return await db.scalar(select(Integration).where(Integration.user_id == user.id))


@respx.mock
async def test_callback_creates_encrypted_integration(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    refresh_token = secrets.token_urlsafe(16)
    _mock_token_endpoint(refresh_token)
    client.cookies.set("oauth_state", "state-123")
    client.cookies.set("user_id", str(user.id))

    res = await client.get(f"{CALLBACK_URL}?code=auth-code&state=state-123")

    assert res.status_code == status.HTTP_307_TEMPORARY_REDIRECT
    assert res.headers["location"] == "/account"
    created = await _get_integration(db_session, user)
    assert created is not None
    assert decrypt_token(created.encrypted_refresh_token) == refresh_token


@respx.mock
async def test_callback_rejects_state_mismatch(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    token = _mock_token_endpoint()
    client.cookies.set("oauth_state", "expected-state")
    client.cookies.set("user_id", str(user.id))

    res = await client.get(f"{CALLBACK_URL}?code=auth-code&state=wrong-state")

    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert res.json()["detail"] == "Invalid callback response"
    assert not token.called
    assert await _get_integration(db_session, user) is None


@respx.mock
async def test_callback_rejects_missing_user_id(client: AsyncClient):
    token = _mock_token_endpoint()
    client.cookies.set("oauth_state", "state-123")

    res = await client.get(f"{CALLBACK_URL}?code=auth-code&state=state-123")

    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert not token.called


@respx.mock
async def test_grant_revoked_deletes_integration(
    client: AsyncClient, db_session: AsyncSession, user: User, integration: Integration
):
    token = respx.post(GOOGLE_TOKEN_URL).respond(status_code=status.HTTP_401_UNAUTHORIZED)

    res = await client.get(WORKOUTS_URL)

    assert token.called
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert await _get_integration(db_session, user) is None


@respx.mock
async def test_sync_matches_workouts_to_datapoints(
    db_session: AsyncSession, user: User, integration: Integration
):
    _mock_token_endpoint()
    list_route = respx.get(DATAPOINTS_URL).respond(json={"dataPoints": _example_datapoints()})
    patch_routes = [respx.patch(f"{DATAPOINTS_URL}/dp-{i}").respond(json={}) for i in range(2)]

    workouts = await _example_workouts(db_session, user)

    synced = await sync_user(db_session, user.id)

    assert synced == 2
    assert list_route.called
    assert all(route.called for route in patch_routes)
    assert all(workout.sync_datapoint_name is not None for workout in workouts)


async def _example_workouts(db: AsyncSession, user: User) -> list[WorkoutLog]:
    exercise = Exercise(name="Bench Press", owner_id=user.id, category=ExerciseCategory.STRENGTH)
    db.add(exercise)
    await db.flush()

    now = datetime.now(UTC)
    workouts = [
        WorkoutLog(
            user_id=user.id,
            status=WorkoutLogStatus.COMPLETED,
            started_at=now - timedelta(hours=1, minutes=i),
            completed_at=now - timedelta(minutes=i),
            sets=[
                SetLog(exercise_id=exercise.id, set_index=0, reps=10, weight=60.0),
                SetLog(exercise_id=exercise.id, set_index=1, reps=8, weight=65.0),
            ],
        )
        for i in range(2)
    ]
    db.add_all(workouts)
    await db.flush()
    return workouts


def _example_datapoints() -> list[dict]:
    return [
        {
            "name": f"users/me/dataTypes/exercise/dataPoints/dp-{i}",
            "exercise": {
                "exerciseType": STRENGTH_TRAINING_EXERCISE_TYPE,
                "displayName": "Strength training",
                "interval": {
                    "startTime": datetime(2026, 7, 12, 8 + i, tzinfo=UTC).isoformat(),
                    "endTime": datetime(2026, 7, 12, 9 + i, tzinfo=UTC).isoformat(),
                    "startUtcOffset": "0s",
                    "endUtcOffset": "0s",
                },
                "notes": None,
            },
        }
        for i in range(2)
    ]
