

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.exceptions import NotFoundError
from models.plan_session import PlanSession
from plan.service import get_plan
from plan_session.schema import PlanSessionCreate, PlanSessionOut

LOG = get_logger()


async def list_plan_sessions(
    db: AsyncSession, plan_id: UUID, user_id: UUID
) -> list[PlanSessionOut]:
    await get_plan(db, plan_id, user_id)
    req = await db.execute(select(PlanSession).where(PlanSession.plan_id == plan_id))
    return [PlanSessionOut.model_validate(s) for s in req.scalars().all()]


async def create_plan_session(
    db: AsyncSession, plan_id: UUID, user_id: UUID, payload: PlanSessionCreate
) -> PlanSessionOut:
    await get_plan(db, plan_id, user_id)
    session = PlanSession(plan_id=plan_id, name=payload.name, prescription=payload.prescription)
    db.add(session)
    await db.flush()
    await db.refresh(session)
    LOG.info("plan_session_created", plan_session_id=str(session.id), plan_id=str(plan_id))
    return PlanSessionOut.model_validate(session)


async def get_plan_session(
    db: AsyncSession, plan_id: UUID, plan_session_id: UUID, user_id: UUID
) -> PlanSessionOut:
    await get_plan(db, plan_id, user_id)
    req = await db.execute(
        select(PlanSession).where(
            PlanSession.id == plan_session_id, PlanSession.plan_id == plan_id
        )
    )
    session = req.scalar_one_or_none()
    if session is None:
        LOG.warning("plan_session_not_found", plan_session_id=str(plan_session_id))
        raise NotFoundError("Plan session not found")
    return PlanSessionOut.model_validate(session)


async def delete_plan_session(
    db: AsyncSession, plan_id: UUID, plan_session_id: UUID, user_id: UUID
) -> None:
    await get_plan(db, plan_id, user_id)
    result = await db.execute(
        delete(PlanSession).where(
            PlanSession.id == plan_session_id, PlanSession.plan_id == plan_id
        )
    )
    if result.rowcount == 0:  # type: ignore[attr-defined]
        LOG.warning("plan_session_not_found", plan_session_id=str(plan_session_id))
        raise NotFoundError("Plan session not found")
    LOG.info("plan_session_deleted", plan_session_id=str(plan_session_id))