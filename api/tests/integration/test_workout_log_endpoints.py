import uuid

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from utils import example_prescription

from models.exercise import Exercise
from models.plan import Plan
from models.plan_session import PlanSession
from models.set_log import SetLog
from models.user import User
from models.workout_log import WorkoutLog, WorkoutLogStatus


async def example_plan_session(db_session: AsyncSession, user: User) -> PlanSession:
    plan = Plan(owner_id=user.id, name="Test plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()
    session = PlanSession(
        plan_id=plan.id, name="Test session", prescription=example_prescription(exercise.id)
    )
    db_session.add(session)
    await db_session.flush()
    await db_session.refresh(session)
    return session


async def test_create_workout_log(client: AsyncClient, db_session: AsyncSession, user: User):
    session = await example_plan_session(db_session, user)
    res = await client.post(
        "/api/workout-log", json={"plan_session_id": str(session.id), "notes": "logs notes"}
    )

    assert res.status_code == 201
    body = res.json()
    assert body["user_id"] == str(user.id)
    assert body["plan_id"] == str(session.plan_id)
    assert body["plan_session_id"] == str(session.id)
    assert body["status"] == "in_progress"
    assert body["notes"] == "logs notes"


async def test_create_workout_log_without_plan_session(client: AsyncClient):
    res = await client.post("/api/workout-log", json={})

    assert res.status_code == 201
    body = res.json()
    assert body["plan_id"] is None
    assert body["plan_session_id"] is None
    assert body["sets"] == []


async def test_create_workout_log_with_exercises(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add(exercise)
    await db_session.flush()

    res = await client.post(
        "/api/workout-log",
        json={
            "exercises": [
                {
                    "exercise_id": str(exercise.id),
                    "sets": [{"reps": 10, "weight": 100}, {"reps": 8, "weight": 110}],
                }
            ]
        },
    )

    assert res.status_code == 201
    body = res.json()
    assert len(body["sets"]) == 2
    assert body["sets"][0]["set_index"] == 0
    assert body["sets"][1]["set_index"] == 1


async def test_create_workout_log_unknown_exercise_returns_missing_ids(client: AsyncClient):
    missing_id = uuid.uuid4()
    res = await client.post(
        "/api/workout-log",
        json={"exercises": [{"exercise_id": str(missing_id), "sets": [{"reps": 10}]}]},
    )

    assert res.status_code == 404
    assert res.json()["extra"]["missing_exercise_ids"] == [str(missing_id)]


async def test_create_workout_log_plan_session_owned_by_other_user_not_found(
    client: AsyncClient, db_session: AsyncSession, other_user: User
):
    other_session = await example_plan_session(db_session, other_user)

    res = await client.post("/api/workout-log", json={"plan_session_id": str(other_session.id)})

    assert res.status_code == 404


async def test_get_workout_log(client: AsyncClient, db_session: AsyncSession, user: User):
    log = WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None)
    db_session.add(log)
    await db_session.flush()

    res = await client.get(f"/api/workout-log/{log.id}")

    assert res.status_code == 200
    assert res.json()["id"] == str(log.id)


async def test_get_wrong_workout_log_not_found(client: AsyncClient):
    res = await client.get(f"/api/workout-log/{uuid.uuid4()}")

    assert res.status_code == 404


async def test_get_other_users_workout_log_not_found(
    client: AsyncClient, db_session: AsyncSession, other_user: User
):
    log = WorkoutLog(user_id=other_user.id, plan_id=None, plan_session_id=None, notes=None)
    db_session.add(log)
    await db_session.flush()

    res = await client.get(f"/api/workout-log/{log.id}")

    assert res.status_code == 404


async def test_list_workout_logs(client: AsyncClient, db_session: AsyncSession, user: User):
    db_session.add_all(
        [
            WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None),
            WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None),
        ]
    )
    await db_session.flush()

    res = await client.get("/api/workout-log")

    assert res.status_code == 200
    assert res.json()["total"] == 2


async def test_list_workout_logs_filters_by_status(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    db_session.add_all(
        [
            WorkoutLog(
                user_id=user.id,
                plan_id=None,
                plan_session_id=None,
                notes=None,
                status=WorkoutLogStatus.IN_PROGRESS,
            ),
            WorkoutLog(
                user_id=user.id,
                plan_id=None,
                plan_session_id=None,
                notes=None,
                status=WorkoutLogStatus.COMPLETED,
            ),
        ]
    )
    await db_session.flush()

    res = await client.get("/api/workout-log", params={"status": "completed"})

    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["status"] == "completed"


async def test_list_workout_logs_only_returns_own(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    db_session.add_all(
        [
            WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None),
            WorkoutLog(user_id=other_user.id, plan_id=None, plan_session_id=None, notes=None),
        ]
    )
    await db_session.flush()

    res = await client.get("/api/workout-log")

    assert res.status_code == 200
    assert res.json()["total"] == 1


async def test_update_workout_log(client: AsyncClient, db_session: AsyncSession, user: User):
    log = WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes="old")
    db_session.add(log)
    await db_session.flush()

    res = await client.patch(
        f"/api/workout-log/{log.id}", json={"notes": "new", "status": "completed"}
    )

    assert res.status_code == 200
    body = res.json()
    assert body["notes"] == "new"
    assert body["status"] == "completed"


async def test_update_workout_log_not_found(client: AsyncClient):
    res = await client.patch(f"/api/workout-log/{uuid.uuid4()}", json={"notes": "new"})

    assert res.status_code == 404


async def test_delete_workout_log(client: AsyncClient, db_session: AsyncSession, user: User):
    exercise = Exercise(owner_id=user.id, name="Squat")
    log = WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None)
    db_session.add_all([exercise, log])
    await db_session.flush()
    set_log = SetLog(workout_log_id=log.id, exercise_id=exercise.id, set_index=0, reps=10)
    db_session.add(set_log)
    await db_session.flush()
    set_id = set_log.id

    res = await client.delete(f"/api/workout-log/{log.id}")
    assert res.status_code == 204

    follow_up = await client.get(f"/api/workout-log/{log.id}")
    assert follow_up.status_code == 404

    db_session.expire_all()
    orphan_check = await db_session.get(SetLog, set_id)
    assert orphan_check is None


async def test_delete_workout_log_not_found(client: AsyncClient):
    res = await client.delete(f"/api/workout-log/{uuid.uuid4()}")

    assert res.status_code == 404


async def test_delete_other_users_workout_log_not_found(
    client: AsyncClient, db_session: AsyncSession, other_user: User
):
    log = WorkoutLog(user_id=other_user.id, plan_id=None, plan_session_id=None, notes=None)
    db_session.add(log)
    await db_session.flush()

    res = await client.delete(f"/api/workout-log/{log.id}")

    assert res.status_code == 404


async def test_add_sets_index_correct(client: AsyncClient, db_session: AsyncSession, user: User):
    exercise = Exercise(owner_id=user.id, name="Squat")
    log = WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None)
    db_session.add_all([exercise, log])
    await db_session.flush()

    first = await client.post(
        f"/api/workout-log/{log.id}/set",
        json={"exercise_id": str(exercise.id), "reps": 10},
    )
    second = await client.post(
        f"/api/workout-log/{log.id}/set",
        json={"exercise_id": str(exercise.id), "reps": 8},
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["set_index"] == 0
    assert second.json()["set_index"] == 1


async def test_add_set_to_completed_workout_conflict(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    exercise = Exercise(owner_id=user.id, name="Squat")
    log = WorkoutLog(
        user_id=user.id,
        plan_id=None,
        plan_session_id=None,
        notes=None,
        status=WorkoutLogStatus.COMPLETED,
    )
    db_session.add_all([exercise, log])
    await db_session.flush()

    res = await client.post(
        f"/api/workout-log/{log.id}/set",
        json={"exercise_id": str(exercise.id), "reps": 10},
    )

    assert res.status_code == 409


async def test_delete_set_moves_index(client: AsyncClient, db_session: AsyncSession, user: User):
    exercise = Exercise(owner_id=user.id, name="Squat")
    log = WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None)
    db_session.add_all([exercise, log])
    await db_session.flush()
    sets = [
        SetLog(workout_log_id=log.id, exercise_id=exercise.id, set_index=0, reps=10),
        SetLog(workout_log_id=log.id, exercise_id=exercise.id, set_index=1, reps=8),
        SetLog(workout_log_id=log.id, exercise_id=exercise.id, set_index=2, reps=6),
    ]
    db_session.add_all(sets)
    await db_session.flush()

    res = await client.delete(f"/api/workout-log/{log.id}/set/{sets[0].id}")
    assert res.status_code == 204

    await db_session.refresh(sets[1])
    await db_session.refresh(sets[2])
    assert sets[1].set_index == 0
    assert sets[2].set_index == 1


async def test_delete_set_not_found(client: AsyncClient, db_session: AsyncSession, user: User):
    log = WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None)
    db_session.add(log)
    await db_session.flush()

    res = await client.delete(f"/api/workout-log/{log.id}/set/{uuid.uuid4()}")

    assert res.status_code == 404


async def test_update_set(client: AsyncClient, db_session: AsyncSession, user: User):
    exercise = Exercise(owner_id=user.id, name="Squat")
    log = WorkoutLog(user_id=user.id, plan_id=None, plan_session_id=None, notes=None)
    db_session.add_all([exercise, log])
    await db_session.flush()
    set_log = SetLog(workout_log_id=log.id, exercise_id=exercise.id, set_index=0, reps=10)
    db_session.add(set_log)
    await db_session.flush()

    res = await client.patch(
        f"/api/workout-log/{log.id}/set/{set_log.id}", json={"reps": 12, "weight": 100}
    )

    assert res.status_code == 200
    body = res.json()
    assert body["reps"] == 12
    assert body["weight"] == 100


async def test_workout_log_endpoints_require_auth(app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/workout-log")
    assert resp.status_code == 401
