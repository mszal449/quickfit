from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from config.db import get_session_factory


# Breaks streaming - be careful here
class DbSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        session_factory = get_session_factory()
        async with session_factory() as session:
            request.state.db = session
            try:
                response = await call_next(request)
                await session.commit()
                return response
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()


def get_db_session(request: Request) -> AsyncSession:
    return request.state.db


DbSession = Annotated[AsyncSession, Depends(get_db_session)]
