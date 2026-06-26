from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.db import integrity_error_constraint
from common.exceptions import ConflictError, NotFoundError
from exercise.schema import ExerciseCreate, ExerciseOut
from models.exercise import Exercise

LOG = get_logger()


async def list_user_exercises(db: AsyncSession, user_id: UUID) -> list[ExerciseOut]:
    req = await db.execute(
        select(Exercise)
        .where(Exercise.owner_id == user_id, Exercise.is_archived.is_(False))
        .order_by(Exercise.name)
    )
    return [ExerciseOut.model_validate(e) for e in req.scalars().all()]


async def get_exercise(db: AsyncSession, exercise_id: UUID) -> ExerciseOut:
    req = await db.execute(
        select(Exercise).where(Exercise.id == exercise_id, Exercise.is_archived.is_(False))
    )
    exercise = req.scalar_one_or_none()
    if exercise is None:
        LOG.warning("exercise_not_found", exercise_id=str(exercise_id))
        raise NotFoundError("Exercise not found")
    return ExerciseOut.model_validate(exercise)


async def create_user_exercise(
    db: AsyncSession, user_id: UUID, payload: ExerciseCreate
) -> ExerciseOut:
    exercise = Exercise(owner_id=user_id, name=payload.name, description=payload.description)
    db.add(exercise)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if integrity_error_constraint(exc) != "uq_exercises_owner_name_active":
            raise
        LOG.warning("exercise_name_conflict", owner_id=str(user_id), name=payload.name)
        raise ConflictError(
            "Exercise with this name already exists",
            extra={"name": payload.name},
        ) from None
    await db.refresh(exercise)
    LOG.info("exercise_created", exercise_id=str(exercise.id), owner_id=str(user_id))
    return ExerciseOut.model_validate(exercise)


async def delete_user_exercise(db: AsyncSession, user_id: UUID, exercise_id: UUID) -> None:
    result = await db.execute(
        update(Exercise)
        .where(Exercise.id == exercise_id, Exercise.owner_id == user_id)
        .values(is_archived=True)
    )
    if result.rowcount == 0:  # type: ignore[attr-defined]
        LOG.warning("exercise_not_found", exercise_id=str(exercise_id), owner_id=str(user_id))
        raise NotFoundError("Exercise not found")
    LOG.info("exercise_deleted", exercise_id=str(exercise_id), owner_id=str(user_id))


async def assert_exercises_exist(db: AsyncSession, exercise_ids: set[UUID]) -> None:
    if not exercise_ids:
        return
    res = await db.execute(
        select(Exercise.id).where(Exercise.id.in_(exercise_ids), Exercise.is_archived.is_(False))
    )
    found = set(res.scalars().all())
    missing = exercise_ids - found
    if missing:
        missing_ids = sorted(str(m) for m in missing)
        LOG.warning("unknown_exercises", missing=missing_ids)
        raise NotFoundError(
            "One or more exercises do not exist",
            extra={"missing_exercise_ids": missing_ids},
        )
