import uuid

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.friendship import Friendship, FriendshipStatus
from models.user import User


async def test_send_friend_request(client: AsyncClient, user: User, other_user: User):
    resp = await client.post("/api/friend/request", json={"email": other_user.email})

    assert resp.status_code == 201
    body = resp.json()
    assert body["requester_id"] == str(user.id)
    assert body["addressee_id"] == str(other_user.id)
    assert body["status"] == FriendshipStatus.PENDING.value
    assert body["user"]["email"] == other_user.email


async def test_send_friend_request_to_self_is_rejected(client: AsyncClient, user: User):
    resp = await client.post("/api/friend/request", json={"email": user.email})
    assert resp.status_code == 409


async def test_send_friend_request_unknown_email_returns_not_found(client: AsyncClient):
    resp = await client.post("/api/friend/request", json={"email": "nobody@example.com"})
    assert resp.status_code == 404


async def test_send_duplicate_friend_request_is_rejected(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    db_session.add(Friendship(requester_id=user.id, addressee_id=other_user.id))
    await db_session.flush()

    resp = await client.post("/api/friend/request", json={"email": other_user.email})
    assert resp.status_code == 409


async def test_mutual_friend_requests_auto_accept(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    db_session.add(Friendship(requester_id=other_user.id, addressee_id=user.id))
    await db_session.flush()

    resp = await client.post("/api/friend/request", json={"email": other_user.email})

    assert resp.status_code == 201
    assert resp.json()["status"] == FriendshipStatus.ACCEPTED.value


async def test_accept_friend_request(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    friendship = Friendship(requester_id=other_user.id, addressee_id=user.id)
    db_session.add(friendship)
    await db_session.flush()

    resp = await client.post(f"/api/friend/{friendship.id}/accept")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == FriendshipStatus.ACCEPTED.value
    assert body["user"]["email"] == other_user.email


async def test_accept_friend_request_by_requester_is_forbidden(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    friendship = Friendship(requester_id=user.id, addressee_id=other_user.id)
    db_session.add(friendship)
    await db_session.flush()

    resp = await client.post(f"/api/friend/{friendship.id}/accept")
    assert resp.status_code == 403


async def test_accept_already_accepted_request_is_conflict(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    friendship = Friendship(
        requester_id=other_user.id, addressee_id=user.id, status=FriendshipStatus.ACCEPTED
    )
    db_session.add(friendship)
    await db_session.flush()

    resp = await client.post(f"/api/friend/{friendship.id}/accept")
    assert resp.status_code == 409


async def test_list_friendships_filters_by_status(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    pending = Friendship(requester_id=user.id, addressee_id=other_user.id)
    db_session.add(pending)
    await db_session.flush()

    all_resp = await client.get("/api/friend")
    assert all_resp.status_code == 200
    assert all_resp.json()["total"] == 1

    accepted_resp = await client.get("/api/friend", params={"status": "accepted"})
    assert accepted_resp.status_code == 200
    assert accepted_resp.json()["total"] == 0


async def test_remove_friendship(
    client: AsyncClient, db_session: AsyncSession, user: User, other_user: User
):
    friendship = Friendship(
        requester_id=user.id, addressee_id=other_user.id, status=FriendshipStatus.ACCEPTED
    )
    db_session.add(friendship)
    await db_session.flush()

    resp = await client.delete(f"/api/friend/{friendship.id}")
    assert resp.status_code == 204

    list_resp = await client.get("/api/friend")
    assert list_resp.json()["total"] == 0


async def test_remove_friendship_unrelated_user_returns_not_found(
    client: AsyncClient, db_session: AsyncSession, other_user: User
):
    third_party = User(email=f"third-{uuid.uuid4()}@example.com", is_email_verified=True)
    db_session.add(third_party)
    await db_session.flush()
    friendship = Friendship(requester_id=other_user.id, addressee_id=third_party.id)
    db_session.add(friendship)
    await db_session.flush()

    resp = await client.delete(f"/api/friend/{friendship.id}")
    assert resp.status_code == 404


async def test_friend_endpoints_require_auth(app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/friend")
    assert resp.status_code == 401
