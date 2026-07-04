from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status
from structlog import get_logger

from auth.dependencies import CurrentUserId
from common.schema import Page
from config.middleware import DbSession
from plan import service
from plan.schema import PlanCreate, PlanFilterParams, PlanOut, PlanUpdate

LOG = get_logger()
router = APIRouter(prefix="/plan", tags=["plan"])


@router.get("", response_model=Page[PlanOut])
async def get_plans(
    user_id: CurrentUserId,
    filters: Annotated[PlanFilterParams, Query()],
    db: DbSession,
) -> Page[PlanOut]:
    plans = await service.list_plans(db, user_id, filters)
    return Page[PlanOut](items=plans, total=len(plans))


@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(user_id: CurrentUserId, plan_id: UUID, db: DbSession) -> PlanOut:
    return await service.get_plan(db, plan_id, user_id)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PlanOut)
async def create_plan(user_id: CurrentUserId, payload: PlanCreate, db: DbSession) -> PlanOut:
    return await service.create_plan(db, user_id, payload)


@router.patch("/{plan_id}", response_model=PlanOut)
async def update_plan(
    user_id: CurrentUserId, plan_id: UUID, payload: PlanUpdate, db: DbSession
) -> PlanOut:
    return await service.update_plan(db, user_id, plan_id, payload)


@router.post("/{plan_id}/set-default", response_model=PlanOut)
async def set_default_plan(user_id: CurrentUserId, plan_id: UUID, db: DbSession) -> PlanOut:
    return await service.set_default_plan(db, user_id, plan_id)


@router.post("/{plan_id}/unset-default", response_model=PlanOut)
async def unset_default_plan(user_id: CurrentUserId, plan_id: UUID, db: DbSession) -> PlanOut:
    return await service.unset_default_plan(db, user_id, plan_id)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(user_id: CurrentUserId, plan_id: UUID, db: DbSession) -> None:
    return await service.delete_plan(db, user_id, plan_id)
