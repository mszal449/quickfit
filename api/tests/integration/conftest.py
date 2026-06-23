
from pathlib import Path

import pytest
import pytest_asyncio
from alembic.config import Config
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from alembic import command
from config.service import get_config

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"

@pytest.fixture(scope="session", autouse=True)
def apply_migrations():
    cfg = Config(str(ALEMBIC_INI))
    command.upgrade(cfg, "head")

@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(get_config().db_config.db_url, future=True)
    yield eng
    await eng.dispose()

@pytest_asyncio.fixture
async def db_session(engine):
    async with engine.connect() as conn:
        trans = await conn.begin()
        # join_transaction_mode="create_savepoint": every commit() inside the
        # tested code releases a SAVEPOINT instead of ending the outer
        # transaction, so the rollback below always undoes the whole test —
        # even when the service layer commits (which it does when persisting
        # rows we then assert on).
        session = AsyncSession(
            bind=conn,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        yield session
        await session.close()
        await trans.rollback()