import secrets

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from structlog import get_logger

from auth.dependencies import CurrentUser
from auth.google import build_google_auth_url
from auth.schemas import UserOut
from auth.service import (
    delete_user,
    generate_token_pair,
    get_valid_refresh_token,
    handle_google_callback,
    revoke_all_user_tokens,
    revoke_refresh_token,
    set_auth_cookies,
)
from config.middleware import DbSession

LOG = get_logger()
router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", status_code=status.HTTP_200_OK, response_model=UserOut)
def me(user: CurrentUser):
    return UserOut.model_validate(user)


@router.get("/google/login")
async def google_login():
    state = secrets.token_urlsafe(16)
    response = RedirectResponse(build_google_auth_url(state))
    response.set_cookie("oauth_state", state, httponly=True, max_age=600, samesite="lax")
    return response


@router.get("/google/callback")
async def google_callback(code: str, state: str, req: Request, db: DbSession):
    if not state or not code or state != req.cookies.get("oauth_state"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid callback response"
        )
    access, refresh = await handle_google_callback(db, code)

    res = RedirectResponse("/login")
    set_auth_cookies(res, access, refresh)
    return res


@router.post("/refresh", status_code=status.HTTP_204_NO_CONTENT)
async def refresh(db: DbSession, req: Request):
    raw = req.cookies.get("refresh_token")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token provided"
        )

    token = await get_valid_refresh_token(db, raw)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not valid"
        )

    await revoke_refresh_token(db, token)
    access, new_refresh = await generate_token_pair(db, token.user_id)

    res = Response(status_code=status.HTTP_204_NO_CONTENT)
    set_auth_cookies(res, access, new_refresh)
    return res


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(req: Request, db: DbSession):
    raw = req.cookies.get("refresh_token")
    if raw:
        token = await get_valid_refresh_token(db, raw)
        if token:
            await revoke_refresh_token(db, token)

    res = Response(status_code=status.HTTP_204_NO_CONTENT)
    res.delete_cookie("access_token", path="/")
    res.delete_cookie("refresh_token", path="/api/auth")
    return res


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(user: CurrentUser, res: Response, db: DbSession):
    await revoke_all_user_tokens(db, user.id)
    res.delete_cookie("access_token", path="/")
    res.delete_cookie("refresh_token", path="/api/auth")
    return res


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(user: CurrentUser, res: Response, db: DbSession):
    await delete_user(db, user.id)
    res.delete_cookie("access_token", path="/")
    res.delete_cookie("refresh_token", path="/api/auth")
    return res
