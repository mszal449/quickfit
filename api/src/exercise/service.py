from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.exceptions import NotFoundError
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
    await db.flush()
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
