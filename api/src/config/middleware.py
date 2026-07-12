import uuid
from typing import Annotated

import structlog
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send
from structlog import get_logger

from config.db import get_session_factory

LOG = get_logger()


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        structlog.contextvars.bind_contextvars(request_id=str(uuid.uuid4()))
        try:
            await self.app(scope, receive, send)
        finally:
            structlog.contextvars.clear_contextvars()

        status_code: int | None = None

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        await self.app(scope, receive, send_wrapper)

        LOG.info(
            "http_request",
            method=scope["method"],
            path=scope["path"],
            query=scope.get("query_string", b"").decode("latin-1"),
            content_type=_header(scope, b"content-type"),
            status=status_code,
        )


def _header(scope: Scope, name: bytes) -> str | None:
    for key, value in scope.get("headers", []):
        if key == name:
            return value.decode("latin-1")
    return None


# Breaks streaming - be careful here
class DbSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        session_factory = get_session_factory()
        async with session_factory() as session:
            request.state.db = session
            try:
                response = await call_next(request)
            except Exception:
                await session.rollback()
                raise
            else:
                # Exception handlers turn errors into normal responses before
                # call_next returns, so a failed request must be detected here.
                if response.status_code >= 400:
                    await session.rollback()
                else:
                    await session.commit()
                return response
            finally:
                await session.close()


def get_db_session(request: Request) -> AsyncSession:
    return request.state.db


DbSession = Annotated[AsyncSession, Depends(get_db_session)]
