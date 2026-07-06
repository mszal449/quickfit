from uuid import UUID

from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from common.db import integrity_error_constraint
from common.exceptions import ConflictError, NotFoundError
from exercise.schema import ExerciseCreate, ExerciseOut, ExerciseUpdate
from models.exercise import Exercise, ExerciseCategory

LOG = get_logger()


async def _get_owned_exercise(db: AsyncSession, user_id: UUID, exercise_id: UUID) -> Exercise:
    req = await db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            Exercise.owner_id == user_id,
            Exercise.is_archived.is_(False),
        )
    )
    exercise = req.scalar_one_or_none()
    if exercise is None:
        LOG.warning("exercise_not_found", exercise_id=str(exercise_id), owner_id=str(user_id))
        raise NotFoundError("Exercise not found")
    return exercise


async def list_user_exercises(db: AsyncSession, user_id: UUID) -> list[ExerciseOut]:
    req = await db.execute(
        select(Exercise)
        .where(
            or_(Exercise.owner_id == user_id, Exercise.owner_id.is_(None)),
            Exercise.is_archived.is_(False),
        )
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
    exercise = Exercise(
        owner_id=user_id,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        muscle_group=payload.muscle_group,
    )
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


async def update_user_exercise(
    db: AsyncSession, user_id: UUID, exercise_id: UUID, payload: ExerciseUpdate
) -> ExerciseOut:
    exercise = await _get_owned_exercise(db, user_id, exercise_id)

    if payload.name is not None:
        exercise.name = payload.name
    if "description" in payload.model_fields_set:
        exercise.description = payload.description
    if payload.category is not None:
        exercise.category = payload.category
        if payload.category == ExerciseCategory.CARDIO:
            exercise.muscle_group = None
    if "muscle_group" in payload.model_fields_set and payload.category != ExerciseCategory.CARDIO:
        exercise.muscle_group = payload.muscle_group

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
    LOG.info("exercise_updated", exercise_id=str(exercise_id), owner_id=str(user_id))
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
