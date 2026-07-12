import secrets
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from structlog import get_logger

import google_health.service as service
from auth.dependencies import CurrentUser, CurrentUserId
from config.middleware import DbSession
from google_health.schema import IntegrationStatusOut

LOG = get_logger()
router = APIRouter(prefix="/integrations/google-health", tags=["integrations", "google-health"])


@router.get("/connect")
async def connect(user: CurrentUser):
    state = secrets.token_urlsafe(16)
    response = RedirectResponse(service.build_google_health_url(state))
    response.set_cookie("oauth_state", state, httponly=True, max_age=600, samesite="lax")
    response.set_cookie("user_id", str(user.id), httponly=True, max_age=600, samesite="lax")
    return response


@router.get("/google/callback")
async def callback(code: str, state: str, req: Request, db: DbSession):
    if not state or not code or state != req.cookies.get("oauth_state"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid callback response"
        )

    user_id = req.cookies.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid callback response"
        )

    await service.handle_integration_callback(db, UUID(user_id), code)
    return RedirectResponse("/account")


@router.get("/status", response_model=IntegrationStatusOut)
async def status_integration(user_id: CurrentUserId, db: DbSession):
    integration = await service.get_user_integration(db, user_id)
    if integration is None:
        return IntegrationStatusOut(connected=False)
    return IntegrationStatusOut(
        connected=True,
        scope_granted=integration.scope_granted,
        created_at=integration.created_at,
    )


@router.get("/workouts")
async def workouts(user_id: CurrentUserId, db: DbSession):
    return await service.list_datapoints(db, user_id)


@router.delete("/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_integration(user_id: CurrentUserId, db: DbSession):
    await service.revoke_integration(db, user_id)
