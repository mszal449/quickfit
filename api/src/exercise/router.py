import uuid

from fastapi import APIRouter, Query, status
from structlog import get_logger

from auth.dependencies import CurrentUserId
from common.schema import Page
from config.middleware import DbSession
from exercise import service
from exercise.schema import ExerciseCreate, ExerciseOut

LOG = get_logger()
router = APIRouter(prefix="/exercise", tags=["exercise"])


@router.get("", response_model=Page[ExerciseOut])
async def list_exercises(
    db: DbSession,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> Page[ExerciseOut]:
    items, total = await service.list_exercises(db, limit=limit, offset=offset)
    return Page[ExerciseOut](items=items, total=total, limit=limit, offset=offset)


@router.get("/{exercise_id}", response_model=ExerciseOut)
async def get_exercise(
    db: DbSession,
    exercise_id: uuid.UUID,
) -> ExerciseOut:
    return await service.get_exercise(db, exercise_id)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ExerciseOut)
async def create_exercise(
    db: DbSession, user_id: CurrentUserId, payload: ExerciseCreate
) -> ExerciseOut:
    return await service.create_exercise(db, user_id, payload)

