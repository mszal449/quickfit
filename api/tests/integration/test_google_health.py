import secrets
from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
import respx
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.exceptions import NotFoundError
from google_health.const import (
    GOOGLE_DATA_POINTS_URL,
    GOOGLE_HEALTH_API_URL,
    GOOGLE_TOKEN_URL,
)
from google_health.google_client import STRENGTH_TRAINING_EXERCISE_TYPE
from google_health.service import sync_user, users_to_sync
from google_health.util import decrypt_token, encrypt_token
from models.exercise import Exercise, ExerciseCategory
from models.integration import Integration, IntegrationProvider
from models.set_log import SetLog
from models.user import User
from models.workout_log import WorkoutLog, WorkoutLogStatus

CALLBACK_URL = "/api/integrations/google-health/google/callback"
WORKOUTS_URL = "/api/integrations/google-health/workouts"
STATUS_URL = "/api/integrations/google-health/status"
REVOKE_URL = "/api/integrations/google-health/revoke"
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


async def test_status_reports_connected_integration(client: AsyncClient, integration: Integration):
    res = await client.get(STATUS_URL)

    assert res.status_code == status.HTTP_200_OK
    body = res.json()
    assert body["connected"] is True
    assert body["scope_granted"] == integration.scope_granted


async def test_status_without_integration_reports_disconnected(client: AsyncClient):
    res = await client.get(STATUS_URL)

    assert res.status_code == status.HTTP_200_OK
    assert res.json()["connected"] is False


async def test_revoke_deletes_integration(
    client: AsyncClient, db_session: AsyncSession, user: User, integration: Integration
):
    res = await client.delete(REVOKE_URL)

    assert res.status_code == status.HTTP_204_NO_CONTENT
    assert await _get_integration(db_session, user) is None


async def test_revoke_without_integration_returns_not_found(client: AsyncClient):
    res = await client.delete(REVOKE_URL)
    assert res.status_code == status.HTTP_404_NOT_FOUND


async def test_workouts_without_integration_returns_not_found(client: AsyncClient):
    res = await client.get(WORKOUTS_URL)
    assert res.status_code == status.HTTP_404_NOT_FOUND


async def test_google_health_endpoints_require_auth(app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(STATUS_URL)
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


async def test_users_to_sync_only_returns_connected_users_with_unsynced_workouts(
    db_session: AsyncSession, user: User, other_user: User, integration: Integration
):
    await _example_workouts(db_session, user)
    await _example_workouts(db_session, other_user)

    assert await users_to_sync(db_session) == [user.id]


async def test_sync_without_integration_raises_not_found(db_session: AsyncSession, user: User):
    with pytest.raises(NotFoundError):
        await sync_user(db_session, user.id)


@respx.mock
async def test_sync_without_workouts_does_nothing(
    db_session: AsyncSession, user: User, integration: Integration
):
    token = _mock_token_endpoint()
    list_route = respx.get(DATAPOINTS_URL).respond(json={"dataPoints": []})

    assert await sync_user(db_session, user.id) == 0
    assert not token.called
    assert not list_route.called


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
