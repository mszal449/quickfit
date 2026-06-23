import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from auth.schemas import GoogleUserInfo
from auth.service import find_or_create_user
from common.exceptions import ConflictError
from models.user import User


async def test_find_or_create_user(db_session: AsyncSession):
    info = GoogleUserInfo(sub="google-1", email="new@example.com", email_verified=True)

    user = await find_or_create_user(db_session, info)

    assert user.email == info.email
    assert user.is_email_verified


async def test_existing_identity_returns_same_user(db_session: AsyncSession):
    info = GoogleUserInfo(sub="google-2", email="repeat@example.com", email_verified=True)

    first = await find_or_create_user(db_session, info)
    second = await find_or_create_user(db_session, info)

    assert first.id == second.id


async def test_unverified_email_conflict(db_session: AsyncSession):
    db_session.add(User(email="taken@email.com", is_email_verified=False))
    await db_session.flush()

    info = GoogleUserInfo(sub="google-3", email="taken@email.com", email_verified=True)

    with pytest.raises(ConflictError):
        await find_or_create_user(db_session, info)