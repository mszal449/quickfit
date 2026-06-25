
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status
from structlog import getLogger

from auth.dependencies import CurrentUserId
from common.schema import Page
from config.middleware import DbSession
from plan.schema import PlanCreate, PlanFilterParams, PlanOut
from plan.service import create_plan, delete_plan, get_plan, list_plans


LOG = getLogger()
router = APIRouter(prefix="/plan", tags=["plan"])

@router.get("", response_model=Page[PlanOut])
async def get_plans(
    user_id: CurrentUserId, 
    filters: Annotated[PlanFilterParams, Query()],
    db: DbSession,
):
    plans = await list_plans(db, user_id, filters)
    return Page[PlanOut](items=plans, total=len(plans))

@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(
    user_id: CurrentUserId,
    plan_id: UUID,
    db: DbSession,
):
    return await get_plan(db, plan_id, user_id)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_plan(user_id: CurrentUserId, payload: PlanCreate, db: DbSession):
    return await create_plan(db, user_id, payload)

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(user_id: CurrentUserId, plan_id: UUID, db: DbSession):
    return await delete_plan(db, user_id, plan_id)