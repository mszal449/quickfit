from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status
from structlog import get_logger

from auth.dependencies import CurrentUserId
from common.schema import Page
from config.middleware import DbSession
from workout_log import service
from workout_log.schema import (
    AddSetRequest,
    SetLogOut,
    SetLogUpdate,
    WorkoutLogCreate,
    WorkoutLogFilterParams,
    WorkoutLogOut,
    WorkoutLogUpdate,
)

LOG = get_logger()
router = APIRouter(prefix="/workout-log", tags=["workout_log"])


@router.get("", response_model=Page[WorkoutLogOut])
async def get_workout_logs(
    user_id: CurrentUserId,
    filters: Annotated[WorkoutLogFilterParams, Query()],
    db: DbSession,
) -> Page[WorkoutLogOut]:
    logs = await service.list_user_workout_logs(db, user_id, filters)
    return Page[WorkoutLogOut](items=logs, total=len(logs))


@router.get("/last", response_model=WorkoutLogOut)
async def get_last_workout_log(
    user_id: CurrentUserId,
    db: DbSession,
    plan_session_id: UUID | None = Query(default=None),
    plan_id: UUID | None = Query(default=None),
) -> WorkoutLogOut:
    return await service.get_last_completed_workout_log(db, user_id, plan_session_id, plan_id)


@router.get("/{workout_log_id}", response_model=WorkoutLogOut)
async def get_workout_log(
    user_id: CurrentUserId, workout_log_id: UUID, db: DbSession
) -> WorkoutLogOut:
    return await service.get_workout_log(db, user_id, workout_log_id)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WorkoutLogOut)
async def create_workout_log(
    user_id: CurrentUserId, payload: WorkoutLogCreate, db: DbSession
) -> WorkoutLogOut:
    return await service.create_workout_log(db, user_id, payload)


@router.patch("/{workout_log_id}", response_model=WorkoutLogOut)
async def update_workout_log(
    user_id: CurrentUserId, workout_log_id: UUID, payload: WorkoutLogUpdate, db: DbSession
) -> WorkoutLogOut:
    return await service.update_workout_log(db, user_id, workout_log_id, payload)


@router.delete("/{workout_log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_log(user_id: CurrentUserId, workout_log_id: UUID, db: DbSession) -> None:
    return await service.delete_workout_log(db, user_id, workout_log_id)


@router.post("/{workout_log_id}/set", status_code=status.HTTP_201_CREATED, response_model=SetLogOut)
async def add_set(
    user_id: CurrentUserId, workout_log_id: UUID, payload: AddSetRequest, db: DbSession
) -> SetLogOut:
    return await service.add_set(db, user_id, workout_log_id, payload)


@router.delete("/{workout_log_id}/set/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_set(
    user_id: CurrentUserId, workout_log_id: UUID, set_id: UUID, db: DbSession
) -> None:
    return await service.remove_set(db, user_id, workout_log_id, set_id)


@router.patch("/{workout_log_id}/set/{set_id}", response_model=SetLogOut)
async def update_set(
    user_id: CurrentUserId,
    workout_log_id: UUID,
    set_id: UUID,
    payload: SetLogUpdate,
    db: DbSession,
) -> SetLogOut:
    return await service.update_set(db, user_id, workout_log_id, set_id, payload)
