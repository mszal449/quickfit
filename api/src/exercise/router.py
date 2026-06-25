import uuid

from fastapi import APIRouter, status
from structlog import get_logger

from auth.dependencies import CurrentUserId
from common.schema import Page
from config.middleware import DbSession
from exercise import service
from exercise.schema import ExerciseCreate, ExerciseOut

LOG = get_logger()
router = APIRouter(prefix="/exercise", tags=["exercise"])


@router.get("", response_model=Page[ExerciseOut])
async def get_exercises(user_id: CurrentUserId, db: DbSession) -> Page[ExerciseOut]:
    exercises = await service.list_user_exercises(db, user_id)
    return Page[ExerciseOut](items=exercises, total=len(exercises))


@router.get("/{exercise_id}", response_model=ExerciseOut)
async def get_exercise(
    user_id: CurrentUserId, exercise_id: uuid.UUID, db: DbSession
) -> ExerciseOut:
    return await service.get_exercise(db, exercise_id)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ExerciseOut)
async def create_exercise(
    user_id: CurrentUserId, payload: ExerciseCreate, db: DbSession
) -> ExerciseOut:
    return await service.create_user_exercise(db, user_id, payload)


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    user_id: CurrentUserId, exercise_id: uuid.UUID, db: DbSession
) -> None:
    return await service.delete_user_exercise(db, user_id, exercise_id)
