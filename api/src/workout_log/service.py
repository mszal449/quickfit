from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from structlog import get_logger

from common.db import integrity_error_constraint
from common.exceptions import ConflictError, NotFoundError
from exercise.service import assert_exercises_exist
from models.set_log import SetLog
from models.workout_log import WorkoutLog, WorkoutLogStatus
from plan_session.service import get_plan_session_by_id
from workout_log.schema import (
    AddSetRequest,
    ExerciseLogEntry,
    SetLogOut,
    SetLogUpdate,
    WorkoutLogCreate,
    WorkoutLogFilterParams,
    WorkoutLogOut,
    WorkoutLogUpdate,
)

LOG = get_logger()

_SET_INDEX_CONSTRAINT = "uq_set_logs_log_exercise_index"


def _build_sets(exercises: list[ExerciseLogEntry]) -> list[SetLog]:
    return [
        SetLog(
            exercise_id=exercise.exercise_id,
            set_index=index,
            reps=entry.reps,
            weight=entry.weight,
            duration_seconds=entry.duration_seconds,
            distance_m=entry.distance_m,
            completed=entry.completed,
            notes=entry.notes,
        )
        for exercise in exercises
        for index, entry in enumerate(exercise.sets)
    ]


async def _get_owned_workout_log(
    db: AsyncSession, user_id: UUID, workout_log_id: UUID
) -> WorkoutLog:
    req = await db.execute(
        select(WorkoutLog)
        .where(WorkoutLog.id == workout_log_id, WorkoutLog.user_id == user_id)
        .options(selectinload(WorkoutLog.sets))
    )
    log = req.scalar_one_or_none()
    if log is None:
        LOG.warning(
            "workout_log_not_found", workout_log_id=str(workout_log_id), user_id=str(user_id)
        )
        raise NotFoundError("Workout log not found")
    return log


async def list_user_workout_logs(
    db: AsyncSession, user_id: UUID, filters: WorkoutLogFilterParams
) -> list[WorkoutLogOut]:
    query = select(WorkoutLog).where(WorkoutLog.user_id == user_id)
    if filters.status is not None:
        query = query.where(WorkoutLog.status == filters.status)
    if filters.plan_id is not None:
        query = query.where(WorkoutLog.plan_id == filters.plan_id)
    req = await db.execute(
        query.options(selectinload(WorkoutLog.sets)).order_by(WorkoutLog.performed_at.desc())
    )
    return [WorkoutLogOut.model_validate(w) for w in req.scalars().all()]


async def get_last_completed_workout_log(
    db: AsyncSession,
    user_id: UUID,
    plan_session_id: UUID | None,
    plan_id: UUID | None,
) -> WorkoutLogOut:
    query = select(WorkoutLog).where(
        WorkoutLog.user_id == user_id, WorkoutLog.status == WorkoutLogStatus.COMPLETED
    )
    if plan_session_id is not None:
        query = query.where(WorkoutLog.plan_session_id == plan_session_id)
    if plan_id is not None:
        query = query.where(WorkoutLog.plan_id == plan_id)
    req = await db.execute(
        query.options(selectinload(WorkoutLog.sets))
        .order_by(WorkoutLog.performed_at.desc())
        .limit(1)
    )
    log = req.scalar_one_or_none()
    if log is None:
        LOG.warning(
            "workout_log_last_not_found",
            user_id=str(user_id),
            plan_session_id=str(plan_session_id) if plan_session_id else None,
        )
        raise NotFoundError("No completed workout log found")
    return WorkoutLogOut.model_validate(log)


async def get_workout_log(db: AsyncSession, user_id: UUID, workout_log_id: UUID) -> WorkoutLogOut:
    log = await _get_owned_workout_log(db, user_id, workout_log_id)
    return WorkoutLogOut.model_validate(log)


async def create_workout_log(
    db: AsyncSession, user_id: UUID, payload: WorkoutLogCreate
) -> WorkoutLogOut:
    plan_id = None
    if payload.plan_session_id is not None:
        session = await get_plan_session_by_id(db, payload.plan_session_id, user_id)
        plan_id = session.plan_id

    await assert_exercises_exist(db, {e.exercise_id for e in payload.exercises})

    log = WorkoutLog(
        user_id=user_id,
        plan_id=plan_id,
        plan_session_id=payload.plan_session_id,
        performed_at=payload.performed_at or datetime.now(UTC),
        notes=payload.notes,
    )
    log.sets = _build_sets(payload.exercises)
    db.add(log)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if integrity_error_constraint(exc) != _SET_INDEX_CONSTRAINT:
            raise
        LOG.warning("workout_log_duplicate_set_index", user_id=str(user_id))
        raise ConflictError("Duplicate set position for the same exercise") from None
    await db.refresh(log, attribute_names=["sets"])
    LOG.info("workout_log_created", workout_log_id=str(log.id), user_id=str(user_id))
    return WorkoutLogOut.model_validate(log)


async def update_workout_log(
    db: AsyncSession, user_id: UUID, workout_log_id: UUID, payload: WorkoutLogUpdate
) -> WorkoutLogOut:
    log = await _get_owned_workout_log(db, user_id, workout_log_id)

    if payload.performed_at is not None:
        log.performed_at = payload.performed_at
    if "notes" in payload.model_fields_set:
        log.notes = payload.notes
    if payload.status is not None:
        log.status = payload.status
    if payload.exercises is not None:
        await assert_exercises_exist(db, {e.exercise_id for e in payload.exercises})
        log.sets = []
        await db.flush()
        log.sets = _build_sets(payload.exercises)

    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if integrity_error_constraint(exc) != _SET_INDEX_CONSTRAINT:
            raise
        LOG.warning("workout_log_duplicate_set_index", workout_log_id=str(workout_log_id))
        raise ConflictError("Duplicate set position for the same exercise") from None
    await db.refresh(log, attribute_names=["sets"])
    LOG.info("workout_log_updated", workout_log_id=str(workout_log_id), user_id=str(user_id))
    return WorkoutLogOut.model_validate(log)


async def delete_workout_log(db: AsyncSession, user_id: UUID, workout_log_id: UUID) -> None:
    result = await db.execute(
        delete(WorkoutLog).where(WorkoutLog.id == workout_log_id, WorkoutLog.user_id == user_id)
    )
    if result.rowcount == 0:  # type: ignore[attr-defined]
        LOG.warning(
            "workout_log_not_found", workout_log_id=str(workout_log_id), user_id=str(user_id)
        )
        raise NotFoundError("Workout log not found")
    LOG.info("workout_log_deleted", workout_log_id=str(workout_log_id), user_id=str(user_id))


async def add_set(
    db: AsyncSession, user_id: UUID, workout_log_id: UUID, payload: AddSetRequest
) -> SetLogOut:
    log = await _get_owned_workout_log(db, user_id, workout_log_id)
    if log.status == WorkoutLogStatus.COMPLETED:
        LOG.warning("workout_log_completed", workout_log_id=str(workout_log_id))
        raise ConflictError("Cannot add a set to a completed workout")

    await assert_exercises_exist(db, {payload.exercise_id})

    set_index = await db.scalar(
        select(func.count())
        .select_from(SetLog)
        .where(SetLog.workout_log_id == log.id, SetLog.exercise_id == payload.exercise_id)
    )

    set_log = SetLog(
        workout_log_id=log.id,
        exercise_id=payload.exercise_id,
        set_index=set_index or 0,
        reps=payload.reps,
        weight=payload.weight,
        duration_seconds=payload.duration_seconds,
        distance_m=payload.distance_m,
        completed=payload.completed,
        notes=payload.notes,
    )
    db.add(set_log)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if integrity_error_constraint(exc) != _SET_INDEX_CONSTRAINT:
            raise
        LOG.warning("set_log_index_conflict", workout_log_id=str(workout_log_id))
        raise ConflictError("Set already recorded for this position") from None
    await db.refresh(set_log)
    LOG.info(
        "set_log_added",
        workout_log_id=str(workout_log_id),
        exercise_id=str(payload.exercise_id),
        set_index=set_log.set_index,
    )
    return SetLogOut.model_validate(set_log)


async def remove_set(db: AsyncSession, user_id: UUID, workout_log_id: UUID, set_id: UUID) -> None:
    log = await _get_owned_workout_log(db, user_id, workout_log_id)
    if log.status == WorkoutLogStatus.COMPLETED:
        LOG.warning("workout_log_completed", workout_log_id=str(workout_log_id))
        raise ConflictError("Cannot remove a set from a completed workout")

    req = await db.execute(
        select(SetLog).where(SetLog.id == set_id, SetLog.workout_log_id == workout_log_id)
    )
    target = req.scalar_one_or_none()
    if target is None:
        LOG.warning("set_log_not_found", set_id=str(set_id), workout_log_id=str(workout_log_id))
        raise NotFoundError("Set not found")

    exercise_id = target.exercise_id
    await db.delete(target)
    await db.flush()

    remaining = await db.execute(
        select(SetLog)
        .where(SetLog.workout_log_id == workout_log_id, SetLog.exercise_id == exercise_id)
        .order_by(SetLog.set_index)
    )
    remaining_sets = remaining.scalars().all()
    for offset_index, set_log in enumerate(remaining_sets):
        set_log.set_index = len(remaining_sets) + offset_index
    await db.flush()
    for index, set_log in enumerate(remaining_sets):
        set_log.set_index = index
    await db.flush()
    LOG.info("set_log_removed", workout_log_id=str(workout_log_id), set_id=str(set_id))


async def update_set(
    db: AsyncSession, user_id: UUID, workout_log_id: UUID, set_id: UUID, payload: SetLogUpdate
) -> SetLogOut:
    log = await _get_owned_workout_log(db, user_id, workout_log_id)
    if log.status == WorkoutLogStatus.COMPLETED:
        LOG.warning("workout_log_completed", workout_log_id=str(workout_log_id))
        raise ConflictError("Cannot modify a set on a completed workout")

    req = await db.execute(
        select(SetLog).where(SetLog.id == set_id, SetLog.workout_log_id == workout_log_id)
    )
    set_log = req.scalar_one_or_none()
    if set_log is None:
        LOG.warning("set_log_not_found", set_id=str(set_id), workout_log_id=str(workout_log_id))
        raise NotFoundError("Set not found")

    fields_set = payload.model_fields_set
    if "reps" in fields_set:
        set_log.reps = payload.reps
    if "weight" in fields_set:
        set_log.weight = payload.weight
    if "duration_seconds" in fields_set:
        set_log.duration_seconds = payload.duration_seconds
    if "distance_m" in fields_set:
        set_log.distance_m = payload.distance_m
    if payload.completed is not None:
        set_log.completed = payload.completed
    if "notes" in fields_set:
        set_log.notes = payload.notes

    await db.flush()
    await db.refresh(set_log)
    LOG.info("set_log_updated", workout_log_id=str(workout_log_id), set_id=str(set_id))
    return SetLogOut.model_validate(set_log)
