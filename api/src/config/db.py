from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from structlog import get_logger

from config.service import DatabaseConfig
from models.model_base import Base

l = get_logger()

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None

def init_db(cfg: DatabaseConfig) -> AsyncEngine:
    if _engine is not None:
        l.error("init database acalled after already initialized")
    
    engine = create_async_engine(
        cfg.db_url,
        echo=False,
        future=True,
        pool_pre_ping=True
    )
    set_database_engine(engine)
    return engine

async def close_db() -> None:
    if _engine:
        await _engine.dispose()

def set_database_engine(engine: AsyncEngine):
    global _engine, _session_factory
    _engine = engine
    if _engine is None:
        _session_factory = None
    else:
        _session_factory = async_sessionmaker(
            bind=_engine,
            expire_on_commit=False,
            autoflush=False
        )

def get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        raise ValueError("Session factory not initialized")
    return _session_factory