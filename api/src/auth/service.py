import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth.google import exchange_code_for_token, fetch_google_user
from auth.schemas import GoogleUserInfo
from auth.security import create_access_token, create_refresh_token, hash_token
from config.service import get_config
from models.refresh_token import RefreshToken
from models.user import AuthIdentity, AuthProvider, User


async def find_or_create_user(db: AsyncSession, info: GoogleUserInfo) -> User:
    res_id = await db.execute(
        select(AuthIdentity)
        .where(
            AuthIdentity.provider == AuthProvider.GOOGLE,
            AuthIdentity.provider_account_id == info.sub,
        )
        .options(selectinload(AuthIdentity.user))
    )
    identity = res_id.scalar_one_or_none()
    if identity:
        return identity.user

    res_user = await db.execute(select(User).where(User.email == info.email))
    existing = res_user.scalar_one_or_none()
    if existing:
        if not (existing.is_email_verified and info.email_verified):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
            )
        user = existing
    else:
        user = User(email=info.email, is_email_verified=info.email_verified)
        db.add(user)
        await db.flush()

    new_identity = AuthIdentity(
        user_id=user.id, provider=AuthProvider.GOOGLE, provider_account_id=info.sub
    )
    db.add(new_identity)
    await db.flush()
    return user


async def handle_google_callback(db: AsyncSession, code: str) -> tuple[str, str]:
    google_token = await exchange_code_for_token(code)
    info = await fetch_google_user(google_token)
    user = await find_or_create_user(db, info)
    access, refresh = await generate_token_pair(db, user.id)
    return access, refresh


async def generate_token_pair(db: AsyncSession, user_id: uuid.UUID) -> tuple[str, str]:
    cfg = get_config().jwt
    access = create_access_token(user_id)
    refresh_raw = create_refresh_token()
    hashed = hash_token(refresh_raw)

    refresh = RefreshToken(
        user_id=user_id,
        token_hash=hashed,
        revoked=False,
        expires_at=datetime.now(UTC) + timedelta(seconds=cfg.refresh_token_ttl),
    )
    db.add(refresh)
    await db.flush()
    return access, refresh_raw


def set_auth_cookies(res: Response, access_token: str, refresh_token: str):
    cfg = get_config().jwt
    res.set_cookie(
        "access_token",
        access_token,
        max_age=cfg.access_token_ttl,
        httponly=True,
        samesite="lax",
        path="/",
    )
    res.set_cookie(
        "refresh_token",
        refresh_token,
        max_age=cfg.refresh_token_ttl,
        httponly=True,
        samesite="lax",
        path="/api/auth",
    )


async def get_valid_refresh_token(db: AsyncSession, raw_token: str) -> RefreshToken | None:
    hashed = hash_token(raw_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hashed))
    token = result.scalar_one_or_none()
    if token is None:
        return None
    if token.revoked or token.expires_at < datetime.now(UTC):
        return None
    return token


async def revoke_refresh_token(db: AsyncSession, token: RefreshToken) -> None:
    token.revoked = True
    await db.flush()


async def revoke_all_user_tokens(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken).where(RefreshToken.user_id == user_id).values(revoked=True)
    )
