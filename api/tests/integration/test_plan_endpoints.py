import uuid

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.testing.warnings import assert_warnings

from auth.dependencies import get_current_user_id
from models.plan import Plan, PlanVisibility
from models.plan_share import PlanShare, PlanShareStatus
from models.user import User


async def test_create_plan_defaults_to_private(client: AsyncClient, user: User):
    resp = await client.post("/api/plan", json={"name": "Strength block", "description": None})

    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Strength block"
    assert body["owner_id"] == str(user.id)
    assert body["visibility"] == PlanVisibility.PRIVATE.value


async def test_get_own_plan(client: AsyncClient, db_session: AsyncSession, user: User):
    plan = Plan(owner_id=user.id, name="My plan", description=None)
    db_session.add(plan)
    await db_session.flush()

    resp = await client.get(f"/api/plan/{plan.id}")

    assert resp.status_code == 200
    assert resp.json()["id"] == str(plan.id)


async def test_get_plan_not_found_for_unrelated_user(
    client: AsyncClient, db_session: AsyncSession, other_user: User
):
    plan = Plan(owner_id=other_user.id, name="Not yours", description=None)
    db_session.add(plan)
    await db_session.flush()

    resp = await client.get(f"/api/plan/{plan.id}")
    assert resp.status_code == 404


async def test_get_plan_accessible_when_shared_and_accepted(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    plan = Plan(owner_id=other_user.id, name="Shared plan", description=None)
    db_session.add(plan)
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

    resp = await client.get(f"/api/plan/{plan.id}")
    assert resp.status_code == 200


async def test_get_plan_not_accessible_when_share_pending(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    plan = Plan(owner_id=other_user.id, name="Pending share", description=None)
    db_session.add(plan)
    await db_session.flush()
    db_session.add(
        PlanShare(
            plan_id=plan.id,
            owner_id=other_user.id,
            shared_with_user_id=user.id,
            status=PlanShareStatus.PENDING,
        )
    )
    await db_session.flush()

    resp = await client.get(f"/api/plan/{plan.id}")
    assert resp.status_code == 404


async def test_list_plans_defaults_to_own_only(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    db_session.add_all(
        [
            Plan(owner_id=user.id, name="Mine", description=None),
            Plan(owner_id=other_user.id, name="Not mine", description=None),
        ]
    )
    await db_session.flush()

    resp = await client.get("/api/plan")

    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Mine"


async def test_list_plans_shared_with_me_filter(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    own_plan = Plan(owner_id=user.id, name="Mine", description=None)
    shared_plan = Plan(owner_id=other_user.id, name="Shared with me", description=None)
    db_session.add_all([own_plan, shared_plan])
    await db_session.flush()
    db_session.add(
        PlanShare(
            plan_id=shared_plan.id,
            owner_id=other_user.id,
            shared_with_user_id=user.id,
            status=PlanShareStatus.ACCEPTED,
        )
    )
    await db_session.flush()

    resp = await client.get("/api/plan", params={"shared_with_me": True})

    assert resp.status_code == 200
    body = resp.json()
    assert [p["name"] for p in body["items"]] == ["Shared with me"]


async def test_list_plans_shared_by_user_id_filter(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    shared_plan = Plan(owner_id=other_user.id, name="From other", description=None)
    db_session.add(shared_plan)
    await db_session.flush()
    db_session.add(
        PlanShare(
            plan_id=shared_plan.id,
            owner_id=other_user.id,
            shared_with_user_id=user.id,
            status=PlanShareStatus.ACCEPTED,
        )
    )
    await db_session.flush()

    matching = await client.get(
        "/api/plan", params={"shared_with_me": True, "shared_by_user_id": str(other_user.id)}
    )
    assert matching.status_code == 200
    assert len(matching.json()["items"]) == 1

    non_matching = await client.get(
        "/api/plan", params={"shared_with_me": True, "shared_by_user_id": str(uuid.uuid4())}
    )
    assert non_matching.status_code == 200
    assert non_matching.json()["items"] == []


async def test_delete_own_plan(client: AsyncClient, db_session: AsyncSession, user: User):
    plan = Plan(owner_id=user.id, name="Disposable", description=None)
    db_session.add(plan)
    await db_session.flush()

    resp = await client.delete(f"/api/plan/{plan.id}")
    assert resp.status_code == 204

    follow_up = await client.get(f"/api/plan/{plan.id}")
    assert follow_up.status_code == 404


async def test_delete_plan_not_owner_returns_not_found(
    client: AsyncClient, app: FastAPI, db_session: AsyncSession, user: User, other_user: User
):
    plan = Plan(owner_id=other_user.id, name="Owned by other", description=None)
    db_session.add(plan)
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

    resp = await client.delete(f"/api/plan/{plan.id}")
    assert resp.status_code == 404

    app.dependency_overrides[get_current_user_id] = lambda: other_user.id
    still_there = await client.get(f"/api/plan/{plan.id}")
    assert still_there.status_code == 200


async def test_set_unset_default_plan(
    client: AsyncClient, db_session: AsyncSession, user: User
):
    plan = Plan(owner_id=user.id, name="First", description=None)
    db_session.add_all([plan])
    await db_session.flush()

    resp = await client.post(f"/api/plan/{plan.id}/set-default")
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    await db_session.refresh(user)
    assert user.default_plan_id == plan.id

    resp = await client.get(f"/api/plan/{plan.id}/unset-default")
    assert resp.status_code == 200
    assert resp.json()["is_default"] is None



async def test_plan_endpoints_require_auth(app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/plan")
    assert resp.status_code == 401
