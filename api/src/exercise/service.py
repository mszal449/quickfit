import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from common.exceptions import NotFoundError
from exercise.schema import ExerciseCreate, ExerciseOut
from models.exercise import Exercise


async def list_exercises(
    db: AsyncSession, *, limit: int, offset: int
) -> tuple[list[ExerciseOut], int]:
    base = select(Exercise).where(Exercise.is_archived.is_(False))
    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    rows = (
        (await db.execute(base.order_by(Exercise.name).limit(limit).offset(offset)))
        .scalars()
        .all()
    )
    return [ExerciseOut.model_validate(r) for r in rows], total or 0

async def get_exercise(db: AsyncSession, exercise_id: uuid.UUID) -> ExerciseOut:
    query = await db.execute(select(Exercise)
        .where(Exercise.is_archived.is_(False), Exercise.id == exercise_id))
    exercise = query.scalar_one_or_none()
    if exercise is None:
        raise NotFoundError("Exercise not found")
    return ExerciseOut.model_validate(exercise)


async def create_exercise(
    db: AsyncSession, owner_id: uuid.UUID, payload: ExerciseCreate
) -> ExerciseOut:
    exercise = Exercise(
        owner_id=owner_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(exercise)
    await db.flush()
    await db.refresh(exercise)
    return ExerciseOut.model_validate(exercise)

