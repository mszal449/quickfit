import uuid

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user_id
from models.exercise import Exercise
from models.user import User


async def test_create_exercise(client: AsyncClient, user: User):
    resp = await client.post(
        "/api/exercise",
        json={"name": "Squat", "description": "Back squat", "muscle_group": "quads"},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Squat"
    assert body["description"] == "Back squat"
    assert body["owner_id"] == str(user.id)
    assert "id" in body


async def test_create_exercise_duplicate_name_conflict(client: AsyncClient):
    payload = {"name": "Deadlift", "description": None, "muscle_group": "back"}

    first = await client.post("/api/exercise", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/exercise", json=payload)
    assert second.status_code == 409
    assert second.json()["extra"]["name"] == "Deadlift"


async def test_create_exercise_same_name_different_owner_ok(
    client: AsyncClient, app: FastAPI, other_user: User
):
    payload = {"name": "Bench Press", "description": None, "muscle_group": "chest"}

    first = await client.post("/api/exercise", json=payload)
    assert first.status_code == 201

    app.dependency_overrides[get_current_user_id] = lambda: other_user.id
    second = await client.post("/api/exercise", json=payload)
    assert second.status_code == 201


async def test_list_exercises_only_returns_own(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    db_session.add_all(
        [
            Exercise(owner_id=user.id, name="Mine"),
            Exercise(owner_id=other_user.id, name="Not mine"),
        ]
    )
    await db_session.flush()

    resp = await client.get("/api/exercise")

    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert [e["name"] for e in body["items"]] == ["Mine"]


async def test_list_exercises_excludes_archived(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    db_session.add(Exercise(owner_id=user.id, name="Archived", is_archived=True))
    await db_session.flush()

    resp = await client.get("/api/exercise")

    assert resp.status_code == 200
    assert resp.json()["total"] == 0


async def test_get_exercise_any_owner_by_id(
    client: AsyncClient, db_session: AsyncSession, other_user: User
):
    exercise = Exercise(owner_id=other_user.id, name="Lunges")
    db_session.add(exercise)
    await db_session.flush()

    resp = await client.get(f"/api/exercise/{exercise.id}")

    assert resp.status_code == 200
    assert resp.json()["name"] == "Lunges"


async def test_get_exercise_not_found(client: AsyncClient):
    resp = await client.get(f"/api/exercise/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_get_archived_exercise_not_found(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    exercise = Exercise(owner_id=user.id, name="Gone", is_archived=True)
    db_session.add(exercise)
    await db_session.flush()

    resp = await client.get(f"/api/exercise/{exercise.id}")
    assert resp.status_code == 404


async def test_delete_own_exercise_soft_deletes(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    exercise = Exercise(owner_id=user.id, name="Burpees")
    db_session.add(exercise)
    await db_session.flush()

    resp = await client.delete(f"/api/exercise/{exercise.id}")
    assert resp.status_code == 204

    await db_session.refresh(exercise)
    assert exercise.is_archived is True

    follow_up = await client.get(f"/api/exercise/{exercise.id}")
    assert follow_up.status_code == 404


async def test_delete_other_users_exercise_not_found(
    client: AsyncClient, db_session: AsyncSession, other_user: User
):
    exercise = Exercise(owner_id=other_user.id, name="Not yours")
    db_session.add(exercise)
    await db_session.flush()

    resp = await client.delete(f"/api/exercise/{exercise.id}")
    assert resp.status_code == 404

    await db_session.refresh(exercise)
    assert exercise.is_archived is False


async def test_delete_then_recreate_same_name_succeeds(client: AsyncClient):
    payload = {"name": "Pull-up", "description": None, "muscle_group": "back"}

    created = await client.post("/api/exercise", json=payload)
    exercise_id = created.json()["id"]

    deleted = await client.delete(f"/api/exercise/{exercise_id}")
    assert deleted.status_code == 204

    recreated = await client.post("/api/exercise", json=payload)
    assert recreated.status_code == 201
    assert recreated.json()["id"] != exercise_id


async def test_exercise_endpoints_require_auth(app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/exercise")
    assert resp.status_code == 401
