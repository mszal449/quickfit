from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.db import integrity_error_constraint
from common.exceptions import ConflictError, ForbiddenError, NotFoundError
from friend.schema import (
    FriendRequestCreate,
    FriendshipFilterParams,
    FriendshipOut,
    FriendUserOut,
)
from models.friendship import Friendship, FriendshipStatus
from models.user import User

LOG = get_logger()

_UNIQUE_PAIR_CONSTRAINT = "uq_friendships_requester_addressee"


def _other_user_id(friendship: Friendship, user_id: UUID) -> UUID:
    if friendship.requester_id == user_id:
        return friendship.addressee_id
    return friendship.requester_id


def _to_friendship_out(friendship: Friendship, other_user: User) -> FriendshipOut:
    return FriendshipOut(
        id=friendship.id,
        requester_id=friendship.requester_id,
        addressee_id=friendship.addressee_id,
        status=friendship.status,
        created_at=friendship.created_at,
        user=FriendUserOut.model_validate(other_user),
    )


async def _get_related_friendship(
    db: AsyncSession, user_id: UUID, friendship_id: UUID
) -> Friendship:
    req = await db.execute(
        select(Friendship).where(
            Friendship.id == friendship_id,
            or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
        )
    )
    friendship = req.scalar_one_or_none()
    if friendship is None:
        raise NotFoundError("Friendship not found")
    return friendship


async def list_friendships(
    db: AsyncSession, user_id: UUID, filters: FriendshipFilterParams
) -> list[FriendshipOut]:
    query = select(Friendship).where(
        or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id)
    )
    if filters.status is not None:
        query = query.where(Friendship.status == filters.status)
    req = await db.execute(query.order_by(Friendship.created_at.desc()))
    friendships = req.scalars().all()

    other_ids = {_other_user_id(f, user_id) for f in friendships}
    if not other_ids:
        return []
    users_req = await db.execute(select(User).where(User.id.in_(other_ids)))
    users_by_id = {u.id: u for u in users_req.scalars().all()}

    return [_to_friendship_out(f, users_by_id[_other_user_id(f, user_id)]) for f in friendships]


async def send_friend_request(
    db: AsyncSession, user_id: UUID, payload: FriendRequestCreate
) -> FriendshipOut:
    req = await db.execute(select(User).where(User.email == payload.email))
    addressee = req.scalar_one_or_none()
    if addressee is None:
        raise NotFoundError("User not found")
    if addressee.id == user_id:
        raise ConflictError("Cannot send a friend request to yourself")

    existing_req = await db.execute(
        select(Friendship).where(
            or_(
                (Friendship.requester_id == user_id) & (Friendship.addressee_id == addressee.id),
                (Friendship.requester_id == addressee.id) & (Friendship.addressee_id == user_id),
            )
        )
    )
    existing = existing_req.scalar_one_or_none()
    if existing is not None:
        if existing.status == FriendshipStatus.ACCEPTED:
            raise ConflictError("Already friends")
        if existing.requester_id == user_id:
            raise ConflictError("Friend request already sent")
        existing.status = FriendshipStatus.ACCEPTED
        await db.flush()
        await db.refresh(existing)
        LOG.info(
            "friend_request_mutual_auto_accepted",
            friendship_id=str(existing.id),
            user_id=str(user_id),
        )
        return _to_friendship_out(existing, addressee)

    friendship = Friendship(requester_id=user_id, addressee_id=addressee.id)
    db.add(friendship)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if integrity_error_constraint(exc) != _UNIQUE_PAIR_CONSTRAINT:
            raise
        LOG.debug("friendship_conflict", user_id=str(user_id), addressee_id=str(addressee.id))
        raise ConflictError("Friend request already exists") from None
    await db.refresh(friendship)
    LOG.info("friend_request_sent", friendship_id=str(friendship.id), user_id=str(user_id))
    return _to_friendship_out(friendship, addressee)


async def accept_friend_request(
    db: AsyncSession, user_id: UUID, friendship_id: UUID
) -> FriendshipOut:
    friendship = await _get_related_friendship(db, user_id, friendship_id)
    if friendship.addressee_id != user_id:
        LOG.warning(
            "friendship_accept_forbidden", friendship_id=str(friendship_id), user_id=str(user_id)
        )
        raise ForbiddenError("Only the recipient can accept a friend request")
    if friendship.status != FriendshipStatus.PENDING:
        raise ConflictError("Friend request is not pending")

    friendship.status = FriendshipStatus.ACCEPTED
    await db.flush()
    await db.refresh(friendship)

    other = await User.get(db, friendship.requester_id)
    if other is None:
        LOG.warning("friendship_requester_missing", friendship_id=str(friendship_id))
        raise NotFoundError("Friend request requester not found")
    LOG.info("friend_request_accepted", friendship_id=str(friendship_id), user_id=str(user_id))
    return _to_friendship_out(friendship, other)


async def remove_friendship(db: AsyncSession, user_id: UUID, friendship_id: UUID) -> None:
    friendship = await _get_related_friendship(db, user_id, friendship_id)
    await db.delete(friendship)
    await db.flush()
    LOG.info("friendship_removed", friendship_id=str(friendship_id), user_id=str(user_id))
