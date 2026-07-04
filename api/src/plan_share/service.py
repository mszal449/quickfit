from uuid import UUID

from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from structlog import get_logger

from common.db import integrity_error_constraint
from common.exceptions import ConflictError, ForbiddenError, NotFoundError
from models.friendship import Friendship, FriendshipStatus
from models.plan_share import PlanShare, PlanShareStatus
from models.user import User
from models.workout_log import WorkoutLog
from plan.service import get_owned_plan
from plan_share.schema import (
    PlanShareCreate,
    PlanShareFilterParams,
    PlanShareOut,
    PlanShareUserOut,
)
from workout_log.schema import WorkoutLogOut

LOG = get_logger()

_UNIQUE_SHARE_CONSTRAINT = "uq_plan_shares_plan_id_shared_with_user_id"


def _other_user_id(share: PlanShare, user_id: UUID) -> UUID:
    if share.owner_id == user_id:
        return share.shared_with_user_id
    return share.owner_id


def _to_plan_share_out(share: PlanShare, other_user: User) -> PlanShareOut:
    return PlanShareOut(
        id=share.id,
        plan_id=share.plan_id,
        owner_id=share.owner_id,
        shared_with_user_id=share.shared_with_user_id,
        status=share.status,
        created_at=share.created_at,
        updated_at=share.updated_at,
        user=PlanShareUserOut.model_validate(other_user),
    )


async def _get_related_plan_share(
    db: AsyncSession, user_id: UUID, plan_share_id: UUID
) -> PlanShare:
    req = await db.execute(
        select(PlanShare).where(
            PlanShare.id == plan_share_id,
            or_(PlanShare.owner_id == user_id, PlanShare.shared_with_user_id == user_id),
        )
    )
    share = req.scalar_one_or_none()
    if share is None:
        LOG.warning("plan_share_not_found", plan_share_id=str(plan_share_id), user_id=str(user_id))
        raise NotFoundError("Plan share not found")
    return share


async def _assert_are_friends(db: AsyncSession, user_id: UUID, other_user_id: UUID) -> None:
    req = await db.execute(
        select(Friendship).where(
            Friendship.status == FriendshipStatus.ACCEPTED,
            or_(
                (Friendship.requester_id == user_id) & (Friendship.addressee_id == other_user_id),
                (Friendship.requester_id == other_user_id) & (Friendship.addressee_id == user_id),
            ),
        )
    )
    if req.scalar_one_or_none() is None:
        LOG.warning(
            "plan_share_target_not_friend", user_id=str(user_id), target_id=str(other_user_id)
        )
        raise ForbiddenError("Can only share plans with friends")


async def list_plan_shares(
    db: AsyncSession, user_id: UUID, filters: PlanShareFilterParams
) -> list[PlanShareOut]:
    query = select(PlanShare).where(
        or_(PlanShare.owner_id == user_id, PlanShare.shared_with_user_id == user_id)
    )
    if filters.plan_id is not None:
        query = query.where(PlanShare.plan_id == filters.plan_id)
    if filters.status is not None:
        query = query.where(PlanShare.status == filters.status)
    req = await db.execute(query.order_by(PlanShare.created_at.desc()))
    shares = req.scalars().all()

    other_ids = {_other_user_id(s, user_id) for s in shares}
    if not other_ids:
        return []
    users_req = await db.execute(select(User).where(User.id.in_(other_ids)))
    users_by_id = {u.id: u for u in users_req.scalars().all()}

    return [_to_plan_share_out(s, users_by_id[_other_user_id(s, user_id)]) for s in shares]


async def create_plan_share(
    db: AsyncSession, user_id: UUID, payload: PlanShareCreate
) -> PlanShareOut:
    await get_owned_plan(db, payload.plan_id, user_id)

    target = await User.get(db, payload.shared_with_user_id)
    if target is None:
        LOG.warning("plan_share_target_not_found", target_id=str(payload.shared_with_user_id))
        raise NotFoundError("User not found")
    if target.id == user_id:
        raise ConflictError("Cannot share a plan with yourself")

    await _assert_are_friends(db, user_id, target.id)

    existing_req = await db.execute(
        select(PlanShare).where(
            PlanShare.plan_id == payload.plan_id, PlanShare.shared_with_user_id == target.id
        )
    )
    existing = existing_req.scalar_one_or_none()
    if existing is not None:
        if existing.status in (PlanShareStatus.PENDING, PlanShareStatus.ACCEPTED):
            raise ConflictError("Plan already shared with this user")
        existing.status = PlanShareStatus.PENDING
        await db.flush()
        await db.refresh(existing)
        LOG.info("plan_share_reactivated", plan_share_id=str(existing.id), user_id=str(user_id))
        return _to_plan_share_out(existing, target)

    share = PlanShare(plan_id=payload.plan_id, owner_id=user_id, shared_with_user_id=target.id)
    db.add(share)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if integrity_error_constraint(exc) != _UNIQUE_SHARE_CONSTRAINT:
            raise
        LOG.warning("plan_share_conflict", user_id=str(user_id), target_id=str(target.id))
        raise ConflictError("Plan already shared with this user") from None
    await db.refresh(share)
    LOG.info("plan_share_created", plan_share_id=str(share.id), user_id=str(user_id))
    return _to_plan_share_out(share, target)


async def accept_plan_share(db: AsyncSession, user_id: UUID, plan_share_id: UUID) -> PlanShareOut:
    share = await _get_related_plan_share(db, user_id, plan_share_id)
    if share.shared_with_user_id != user_id:
        LOG.warning(
            "plan_share_accept_forbidden", plan_share_id=str(plan_share_id), user_id=str(user_id)
        )
        raise ForbiddenError("Only the recipient can accept a plan share")
    if share.status != PlanShareStatus.PENDING:
        raise ConflictError("Plan share is not pending")

    share.status = PlanShareStatus.ACCEPTED
    await db.flush()
    await db.refresh(share)

    owner = await User.get(db, share.owner_id)
    if owner is None:
        LOG.warning("plan_share_owner_missing", plan_share_id=str(plan_share_id))
        raise NotFoundError("Plan share owner not found")
    LOG.info("plan_share_accepted", plan_share_id=str(plan_share_id), user_id=str(user_id))
    return _to_plan_share_out(share, owner)


async def revoke_plan_share(db: AsyncSession, user_id: UUID, plan_share_id: UUID) -> PlanShareOut:
    share = await _get_related_plan_share(db, user_id, plan_share_id)
    if share.owner_id != user_id:
        LOG.warning(
            "plan_share_revoke_forbidden", plan_share_id=str(plan_share_id), user_id=str(user_id)
        )
        raise ForbiddenError("Only the owner can revoke a plan share")
    if share.status != PlanShareStatus.ACCEPTED:
        raise ConflictError("Plan share is not active")

    share.status = PlanShareStatus.REVOKED
    await db.flush()
    await db.refresh(share)

    recipient = await User.get(db, share.shared_with_user_id)
    if recipient is None:
        LOG.warning("plan_share_recipient_missing", plan_share_id=str(plan_share_id))
        raise NotFoundError("Plan share recipient not found")
    if recipient.default_plan_id == share.plan_id:
        await db.execute(
            update(User.default_plan_id).where(User.id == recipient.id).values(default_plan_id=None)
        )
    LOG.info("plan_share_revoked", plan_share_id=str(plan_share_id), user_id=str(user_id))
    return _to_plan_share_out(share, recipient)


async def remove_plan_share(db: AsyncSession, user_id: UUID, plan_share_id: UUID) -> None:
    share = await _get_related_plan_share(db, user_id, plan_share_id)
    if share.owner_id == user_id and share.status != PlanShareStatus.PENDING:
        raise ConflictError("Use revoke to remove an accepted share")
    recipient = await User.get(db, share.shared_with_user_id)
    await db.delete(share)
    if recipient is not None and recipient.default_plan_id == share.plan_id:
        await db.execute(
            update(User.default_plan_id).where(User.id == recipient.id).values(default_plan_id=None)
        )
    await db.flush()
    LOG.info("plan_share_removed", plan_share_id=str(plan_share_id), user_id=str(user_id))


async def get_share_progress(
    db: AsyncSession, user_id: UUID, plan_share_id: UUID
) -> list[WorkoutLogOut]:
    req = await db.execute(
        select(PlanShare).where(PlanShare.id == plan_share_id, PlanShare.owner_id == user_id)
    )
    share = req.scalar_one_or_none()
    if share is None:
        LOG.warning("plan_share_not_found", plan_share_id=str(plan_share_id), user_id=str(user_id))
        raise NotFoundError("Plan share not found")
    if share.status != PlanShareStatus.ACCEPTED:
        raise ConflictError("Share is not active")

    logs_req = await db.execute(
        select(WorkoutLog)
        .where(
            WorkoutLog.user_id == share.shared_with_user_id,
            WorkoutLog.plan_id == share.plan_id,
        )
        .options(selectinload(WorkoutLog.sets))
        .order_by(WorkoutLog.started_at.desc())
    )
    return [WorkoutLogOut.model_validate(w) for w in logs_req.scalars().all()]
