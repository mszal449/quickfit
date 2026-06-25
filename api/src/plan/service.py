

from uuid import UUID

from sqlalchemy import delete, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.exceptions import NotFoundError
from models.plan import Plan
from models.plan_share import PlanShare, PlanShareStatus
from plan.schema import PlanCreate, PlanFilterParams, PlanOut

LOG = get_logger()


# plan/service.py
async def list_plans(
    db: AsyncSession, user_id: UUID, filters: PlanFilterParams
) -> list[PlanOut]:
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

    req = await db.execute(query)
    return [PlanOut.model_validate(plan) for plan in req.scalars().all()]


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
        LOG.warning("plan_not_found", plan_id=str(plan_id), user_id=str(user_id))
        raise NotFoundError("Plan not found")
    return PlanOut.model_validate(plan)


async def create_plan(db: AsyncSession, user_id: UUID, plan: PlanCreate) -> PlanOut:
    new_plan = Plan(
        owner_id=user_id,
        name=plan.name,
        description=plan.description,
        visibility=plan.visibility
    )
    db.add(new_plan)
    await db.flush()
    await db.refresh(new_plan)
    LOG.info("plan_created", plan_id=str(new_plan.id), user_id=str(user_id))
    return PlanOut.model_validate(new_plan)

async def delete_plan(db: AsyncSession, user_id: UUID, plan_id: UUID) -> None:
    result = await db.execute(
        delete(Plan).where(Plan.owner_id == user_id, Plan.id == plan_id)
    )
    if result.rowcount == 0:  # type: ignore[attr-defined]
        LOG.warning("plan_not_found", plan_id=str(plan_id), user_id=str(user_id))
        raise NotFoundError("Plan not found")
    LOG.info("plan_deleted", plan_id=str(plan_id), user_id=str(user_id))
