import uuid

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from utils import example_prescription

from auth.dependencies import get_current_user_id
from models.exercise import Exercise
from models.plan import Plan
from models.plan_session import PlanSession
from models.plan_share import PlanShare, PlanShareStatus
from models.user import User


async def test_create_session(client: AsyncClient, db_session: AsyncSession, user: User):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()

    resp = await client.post(
        f"/api/plan/{plan.id}/session",
        json={"name": "Day 1", "prescription": example_prescription(exercise.id)},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Day 1"
    assert body["plan_id"] == str(plan.id)
    assert body["schema_version"] == 1
    assert body["prescription"]["exercises"][0]["exercise_id"] == str(exercise.id)


async def test_create_session_unknown_exercise_returns_missing_ids(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    db_session.add(plan)
    await db_session.flush()

    missing_id = uuid.uuid4()
    resp = await client.post(
        f"/api/plan/{plan.id}/session",
        json={"name": "Day 1", "prescription": example_prescription(missing_id)},
    )

    assert resp.status_code == 404
    assert resp.json()["extra"]["missing_exercise_ids"] == [str(missing_id)]


async def test_create_session_archived_exercise_treated_as_missing(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Gone", is_archived=True)
    db_session.add_all([plan, exercise])
    await db_session.flush()

    resp = await client.post(
        f"/api/plan/{plan.id}/session",
        json={"name": "Day 1", "prescription": example_prescription(exercise.id)},
    )

    assert resp.status_code == 404
    assert resp.json()["extra"]["missing_exercise_ids"] == [str(exercise.id)]


async def test_create_session_for_plan_owned_by_other_user_not_found(
    client: AsyncClient, db_session: AsyncSession, other_user: User
):
    plan = Plan(owner_id=other_user.id, name="Not yours", description=None)
    exercise = Exercise(owner_id=other_user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()

    resp = await client.post(
        f"/api/plan/{plan.id}/session",
        json={"name": "Day 1", "prescription": example_prescription(exercise.id)},
    )

    assert resp.status_code == 404


async def test_create_session_duplicate_exercise_in_prescription_is_422(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()

    prescription = example_prescription(exercise.id)
    prescription["exercises"].append(prescription["exercises"][0])

    resp = await client.post(
        f"/api/plan/{plan.id}/session",
        json={"name": "Day 1", "prescription": prescription},
    )

    assert resp.status_code == 422


async def test_create_session_invalid_rep_range_is_422(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()

    prescription = {
        "exercises": [
            {
                "exercise_id": str(exercise.id),
                "sets": [{"min_reps": 12, "max_reps": 8}],
                "description": None,
            }
        ]
    }

    resp = await client.post(
        f"/api/plan/{plan.id}/session",
        json={"name": "Day 1", "prescription": prescription},
    )

    assert resp.status_code == 422


async def test_get_session(client: AsyncClient, db_session: AsyncSession, user: User):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()
    session = PlanSession(
        plan_id=plan.id, name="Day 1", prescription=example_prescription(exercise.id)
    )
    db_session.add(session)
    await db_session.flush()

    resp = await client.get(f"/api/plan/{plan.id}/session/{session.id}")

    assert resp.status_code == 200
    assert resp.json()["id"] == str(session.id)


async def test_get_session_wrong_plan_not_found(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    other_plan = Plan(owner_id=user.id, name="Other plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add_all([plan, other_plan, exercise])
    await db_session.flush()
    session = PlanSession(
        plan_id=plan.id, name="Day 1", prescription=example_prescription(exercise.id)
    )
    db_session.add(session)
    await db_session.flush()

    resp = await client.get(f"/api/plan/{other_plan.id}/session/{session.id}")
    assert resp.status_code == 404


async def test_list_sessions(client: AsyncClient, db_session: AsyncSession, user: User):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()
    db_session.add_all(
        [
            PlanSession(
                plan_id=plan.id, name="Day 1", prescription=example_prescription(exercise.id)
            ),
            PlanSession(
                plan_id=plan.id, name="Day 2", prescription=example_prescription(exercise.id)
            ),
        ]
    )
    await db_session.flush()

    resp = await client.get(f"/api/plan/{plan.id}/session")

    assert resp.status_code == 200
    assert resp.json()["total"] == 2


async def test_delete_session(client: AsyncClient, db_session: AsyncSession, user: User):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    exercise = Exercise(owner_id=user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()
    session = PlanSession(
        plan_id=plan.id, name="Day 1", prescription=example_prescription(exercise.id)
    )
    db_session.add(session)
    await db_session.flush()

    resp = await client.delete(f"/api/plan/{plan.id}/session/{session.id}")
    assert resp.status_code == 204

    follow_up = await client.get(f"/api/plan/{plan.id}/session/{session.id}")
    assert follow_up.status_code == 404


async def test_delete_session_not_found(client: AsyncClient, db_session: AsyncSession, user: User):
    plan = Plan(owner_id=user.id, name="Plan", description=None)
    db_session.add(plan)
    await db_session.flush()

    resp = await client.delete(f"/api/plan/{plan.id}/session/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_shared_user_cannot_create_session_on_someone_elses_plan(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    """Shared (read-only) access via an accepted share must not let a follower author
    sessions on someone else's plan — only the owner can. See get_owned_plan in
    plan/service.py, used by create/delete_plan_session instead of the shared-aware
    get_plan that list/get_plan_session use."""
    plan = Plan(owner_id=other_user.id, name="Other's plan", description=None)
    exercise = Exercise(owner_id=other_user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()
    db_session.add(
        PlanShare(
            plan_id=plan.id,
            owner_id=other_user.id,
            shared_with_user_id=user.id,
            status=PlanShareStatus.ACCEPTED,
        )
    )
    await db_session.flush()

    resp = await client.post(
        f"/api/plan/{plan.id}/session",
        json={"name": "Day 1", "prescription": example_prescription(exercise.id)},
    )

    assert resp.status_code == 404


async def test_shared_user_can_read_but_not_delete_session(
    client: AsyncClient, app: FastAPI, db_session: AsyncSession, user: User, other_user: User
):
    plan = Plan(owner_id=other_user.id, name="Other's plan", description=None)
    exercise = Exercise(owner_id=other_user.id, name="Squat")
    db_session.add_all([plan, exercise])
    await db_session.flush()
    session = PlanSession(
        plan_id=plan.id, name="Day 1", prescription=example_prescription(exercise.id)
    )
    db_session.add(session)
    db_session.add(
        PlanShare(
            plan_id=plan.id,
            owner_id=other_user.id,
            shared_with_user_id=user.id,
            status=PlanShareStatus.ACCEPTED,
        )
    )
    await db_session.flush()

    readable = await client.get(f"/api/plan/{plan.id}/session/{session.id}")
    assert readable.status_code == 200

    delete_attempt = await client.delete(f"/api/plan/{plan.id}/session/{session.id}")
    assert delete_attempt.status_code == 404

    app.dependency_overrides[get_current_user_id] = lambda: other_user.id
    still_there = await client.get(f"/api/plan/{plan.id}/session/{session.id}")
    assert still_there.status_code == 200


async def test_plan_session_endpoints_require_auth(app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(f"/api/plan/{uuid.uuid4()}/session")
    assert resp.status_code == 401
