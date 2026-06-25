from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.exceptions import NotFoundError
from models.exercise import Exercise
from models.plan_session import PlanSession
from plan.service import get_plan
from plan_session.prescription import SessionPrescription
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
    await _exercises_exist(db, payload.prescription)
    session = PlanSession(
        plan_id=plan_id,
        name=payload.name,
        prescription=payload.prescription.model_dump(mode="json"),
    )
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
        select(PlanSession).where(PlanSession.id == plan_session_id, PlanSession.plan_id == plan_id)
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
        delete(PlanSession).where(PlanSession.id == plan_session_id, PlanSession.plan_id == plan_id)
    )
    if result.rowcount == 0:  # type: ignore[attr-defined]
        LOG.warning("plan_session_not_found", plan_session_id=str(plan_session_id))
        raise NotFoundError("Plan session not found")
    LOG.info("plan_session_deleted", plan_session_id=str(plan_session_id))


async def _exercises_exist(db: AsyncSession, prescription: SessionPrescription):
    ids = {e.exercise_id for e in prescription.exercises}
    res = await db.execute(
        select(Exercise.id).where(Exercise.id.in_(ids), Exercise.is_archived.is_(False))
    )
    found = set(res.scalars().all())
    missing = ids - found
    if missing:
        missing_ids = sorted(str(m) for m in missing)
        LOG.warning("plan_session_unknown_exercises", missing=missing_ids)
        raise NotFoundError(
            "One or more exercises do not exist",
            extra={"missing_exercise_ids": missing_ids},
        )
