import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from auth.security import InvalidTokenError, decode_access_token
from config.middleware import DbSession
from models.user import User, UserRole


def _sub_from_cookie(req: Request) -> uuid.UUID:
    token = req.cookies.get("access_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)
    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED) from None
    return payload.sub


async def get_current_user(req: Request, db: DbSession) -> User:
    user = await User.get(db, _sub_from_cookie(req))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)
    return user


async def get_current_user_id(req: Request) -> uuid.UUID:
    return _sub_from_cookie(req)


def require_role(role: UserRole):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status.HTTP_403_FORBIDDEN)
        return user

    return checker


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserId = Annotated[uuid.UUID, Depends(get_current_user_id)]
AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]
