from uuid import UUID

from sqlalchemy import exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from structlog import get_logger

from common.exceptions import ConflictError, NotFoundError
from models.plan import Plan
from models.plan_share import PlanShare, PlanShareStatus
from models.user import User
from plan.schema import PlanCreate, PlanFilterParams, PlanOut, PlanUpdate

LOG = get_logger()


async def _get_default_plan(db: AsyncSession, user_id: UUID) -> UUID | None:
    return await db.scalar(select(User.default_plan_id).where(User.id == user_id))


def _to_plan_out(plan: Plan, default_plan_id: UUID | None) -> PlanOut:
    return PlanOut(
        id=plan.id,
        owner_id=plan.owner_id,
        name=plan.name,
        description=plan.description,
        visibility=plan.visibility,
        is_default=(default_plan_id is not None and plan.id == default_plan_id),
        created_at=plan.created_at,
    )


async def list_plans(db: AsyncSession, user_id: UUID, filters: PlanFilterParams) -> list[PlanOut]:
    if filters.shared_with_me or filters.shared_by_user_id:
        query = (
            select(Plan)
            .join(PlanShare, PlanShare.plan_id == Plan.id)
            .where(PlanShare.shared_with_user_id == user_id)
        )
        if filters.shared_by_user_id:
            query = query.where(Plan.owner_id == filters.shared_by_user_id)
    else:
        query = select(Plan).where(Plan.owner_id == user_id)

    req = await db.execute(query.order_by(Plan.created_at.desc()))
    default_plan = await _get_default_plan(db, user_id)
    return [_to_plan_out(plan, default_plan) for plan in req.scalars().all()]


async def get_plan(db: AsyncSession, plan_id: UUID, user_id: UUID) -> PlanOut:
    shared_with_user = exists().where(
        PlanShare.plan_id == Plan.id,
        PlanShare.shared_with_user_id == user_id,
        PlanShare.status == PlanShareStatus.ACCEPTED,
    )
    req = await db.execute(
        select(Plan).where(
            Plan.id == plan_id,
            or_(Plan.owner_id == user_id, shared_with_user),
        )
    )
    plan = req.scalar_one_or_none()
    if plan is None:
        raise NotFoundError("Plan not found")
    default_plan = await _get_default_plan(db, user_id)
    return _to_plan_out(plan, default_plan)


async def get_owned_plan(db: AsyncSession, plan_id: UUID, user_id: UUID) -> PlanOut:
    req = await db.execute(select(Plan).where(Plan.id == plan_id, Plan.owner_id == user_id))
    plan = req.scalar_one_or_none()
    if plan is None:
        raise NotFoundError("Plan not found")
    default_plan = await _get_default_plan(db, user_id)
    return _to_plan_out(plan, default_plan)


async def create_plan(db: AsyncSession, user_id: UUID, plan: PlanCreate) -> PlanOut:
    new_plan = Plan(
        owner_id=user_id, name=plan.name, description=plan.description, visibility=plan.visibility
    )
    db.add(new_plan)
    await db.flush()
    await db.refresh(new_plan)
    LOG.info("plan_created", plan_id=str(new_plan.id), user_id=str(user_id))
    return _to_plan_out(new_plan, None)


async def update_plan(
    db: AsyncSession, user_id: UUID, plan_id: UUID, payload: PlanUpdate
) -> PlanOut:
    req = await db.execute(select(Plan).where(Plan.id == plan_id, Plan.owner_id == user_id))
    plan = req.scalar_one_or_none()
    if plan is None:
        raise NotFoundError("Plan not found")

    if payload.name is not None:
        plan.name = payload.name
    if "description" in payload.model_fields_set:
        plan.description = payload.description
    if payload.visibility is not None:
        plan.visibility = payload.visibility

    await db.flush()
    await db.refresh(plan)
    LOG.info("plan_updated", plan_id=str(plan_id), user_id=str(user_id))
    default_plan = await _get_default_plan(db, user_id)
    return _to_plan_out(plan, default_plan)


async def set_default_plan(db: AsyncSession, user_id: UUID, plan_id: UUID) -> PlanOut:
    await get_plan(db, plan_id, user_id)
    user = await User.get(db, user_id)
    if user is None:
        LOG.warning("user_not_found", user_id=str(user_id))
        raise NotFoundError("User not found")
    user.default_plan_id = plan_id
    await db.flush()
    LOG.info("plan_set_default", plan_id=str(plan_id), user_id=str(user_id))
    return await get_plan(db, plan_id, user_id)


async def unset_default_plan(db: AsyncSession, user_id: UUID, plan_id: UUID) -> PlanOut:
    user = await User.get(db, user_id)
    if user is None:
        LOG.warning("user_not_found", user_id=str(user_id))
        raise NotFoundError("User not found")
    if user.default_plan_id != plan_id:
        raise ConflictError("This plan is not your default")
    user.default_plan_id = None
    await db.flush()
    LOG.info("plan_unset_default", plan_id=str(plan_id), user_id=str(user_id))
    return await get_plan(db, plan_id, user_id)


async def delete_plan(db: AsyncSession, user_id: UUID, plan_id: UUID) -> None:
    req = await db.execute(
        select(Plan)
        .where(Plan.id == plan_id, Plan.owner_id == user_id)
        .options(selectinload(Plan.sessions), selectinload(Plan.shares))
    )
    plan = req.scalar_one_or_none()
    if plan is None:
        raise NotFoundError("Plan not found")
    await db.delete(plan)
    await db.flush()
    LOG.info("plan_deleted", plan_id=str(plan_id), user_id=str(user_id))
