
from uuid import UUID

from fastapi import APIRouter, status
from structlog import getLogger

from auth.dependencies import CurrentUserId
from common.schema import Page
from config.middleware import DbSession
from plan_session.schema import PlanSessionCreate, PlanSessionOut
from plan_session.service import (
    create_plan_session,
    delete_plan_session,
    get_plan_session,
    list_plan_sessions,
)


LOG = getLogger()
router = APIRouter(prefix="/plan/{plan_id}/session", tags=["plan_session"])

@router.get("", response_model=Page[PlanSessionOut])
async def get_sessions(plan_id: UUID, user_id: CurrentUserId, db: DbSession):
    sessions = await list_plan_sessions(db, plan_id, user_id)
    return Page[PlanSessionOut](items=sessions, total=len(sessions))

@router.get("/{plan_session_id}", response_model=PlanSessionOut)
async def get_session(
    plan_id: UUID, plan_session_id: UUID, user_id: CurrentUserId, db: DbSession
):
    return await get_plan_session(db, plan_id, plan_session_id, user_id)

@router.post("", response_model=PlanSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    plan_id: UUID, payload: PlanSessionCreate, user_id: CurrentUserId, db: DbSession
):
    return await create_plan_session(db, plan_id, user_id, payload)

@router.delete("/{plan_session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    plan_id: UUID, plan_session_id: UUID, user_id: CurrentUserId, db: DbSession
):
    return await delete_plan_session(db, plan_id, plan_session_id, user_id)
