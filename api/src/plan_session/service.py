from uuid import UUID

from sqlalchemy import delete, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.exceptions import NotFoundError
from exercise.service import assert_exercises_exist
from models.plan import Plan
from models.plan_session import PlanSession
from models.plan_share import PlanShare, PlanShareStatus
from plan.service import get_owned_plan, get_plan
from plan_session.schema import PlanSessionCreate, PlanSessionOut, PlanSessionUpdate

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
    await get_owned_plan(db, plan_id, user_id)
    await assert_exercises_exist(db, {e.exercise_id for e in payload.prescription.exercises})
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


async def update_plan_session(
    db: AsyncSession,
    plan_id: UUID,
    plan_session_id: UUID,
    user_id: UUID,
    payload: PlanSessionUpdate,
) -> PlanSessionOut:
    await get_owned_plan(db, plan_id, user_id)
    req = await db.execute(
        select(PlanSession).where(PlanSession.id == plan_session_id, PlanSession.plan_id == plan_id)
    )
    session = req.scalar_one_or_none()
    if session is None:
        raise NotFoundError("Plan session not found")

    if payload.name is not None:
        session.name = payload.name
    if payload.prescription is not None:
        await assert_exercises_exist(db, {e.exercise_id for e in payload.prescription.exercises})
        session.prescription = payload.prescription.model_dump(mode="json")

    await db.flush()
    await db.refresh(session)
    LOG.info("plan_session_updated", plan_session_id=str(plan_session_id), plan_id=str(plan_id))
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
        raise NotFoundError("Plan session not found")
    return PlanSessionOut.model_validate(session)


async def get_plan_session_by_id(
    db: AsyncSession, plan_session_id: UUID, user_id: UUID
) -> PlanSessionOut:
    """Like get_plan_session, but resolves the owning plan by joining instead of
    requiring plan_id from the caller. For consumers that only have a
    plan_session_id (e.g. workout_log, logging against a shared plan's session)."""
    shared_with_user = exists().where(
        PlanShare.plan_id == Plan.id,
        PlanShare.shared_with_user_id == user_id,
        PlanShare.status == PlanShareStatus.ACCEPTED,
    )
    req = await db.execute(
        select(PlanSession)
        .join(Plan, Plan.id == PlanSession.plan_id)
        .where(
            PlanSession.id == plan_session_id,
            or_(Plan.owner_id == user_id, shared_with_user),
        )
    )
    session = req.scalar_one_or_none()
    if session is None:
        raise NotFoundError("Plan session not found")
    return PlanSessionOut.model_validate(session)


async def delete_plan_session(
    db: AsyncSession, plan_id: UUID, plan_session_id: UUID, user_id: UUID
) -> None:
    await get_owned_plan(db, plan_id, user_id)
    result = await db.execute(
        delete(PlanSession).where(PlanSession.id == plan_session_id, PlanSession.plan_id == plan_id)
    )
    if result.rowcount == 0:  # type: ignore[attr-defined]
        raise NotFoundError("Plan session not found")
    LOG.info("plan_session_deleted", plan_session_id=str(plan_session_id))
