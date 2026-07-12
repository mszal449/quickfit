from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from structlog import get_logger

from auth import router as auth_router
from common.exceptions import (
    AppError,
    ConflictError,
    ExternalServiceError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
)
from common.logging_config import configure_logging
from config.db import close_db, init_db
from config.middleware import DbSessionMiddleware, RequestLoggingMiddleware
from config.service import get_config
from exercise import router as exercise_router
from friend import router as friend_router
from google_health import router as google_health_router
from health import router as health_router
from plan import router as plan_router
from plan_session import router as plan_session_router
from plan_share import router as plan_share_router
from workout_log import router as workout_log_router

LOG = get_logger()


def custom_operation_id(route: APIRoute) -> str:
    methods = (route.methods or set()) - {"HEAD", "OPTIONS"}
    method = sorted(methods)[0].lower() if methods else "get"
    return f"{route.name}_{method}"


_STATUS_BY_EXCEPTION: dict[type[AppError], int] = {
    NotFoundError: status.HTTP_404_NOT_FOUND,
    ConflictError: status.HTTP_409_CONFLICT,
    ValidationError: status.HTTP_422_UNPROCESSABLE_CONTENT,
    ForbiddenError: status.HTTP_403_FORBIDDEN,
    UnauthorizedError: status.HTTP_401_UNAUTHORIZED,
    ExternalServiceError: status.HTTP_502_BAD_GATEWAY,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db(get_config().db_config)
    yield
    await close_db()


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    code = _STATUS_BY_EXCEPTION.get(type(exc), status.HTTP_400_BAD_REQUEST)
    if code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        LOG.error(
            "server_error",
            error=type(exc).__name__,
            path=request.url.path,
            method=request.method,
            extra=exc.extra,
            exc_info=exc,
        )
    content: dict = {"detail": str(exc)}
    if exc.extra:
        content["extra"] = exc.extra
    return JSONResponse(status_code=code, content=content)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    LOG.exception("unhandled_exception", path=request.url.path, method=request.method)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Something went wrong. Please try again later."},
    )


def create_app():
    cfg = get_config()
    configure_logging("debug" if cfg.debug else "info")
    app = FastAPI(
        title="quickfit-api",
        description="QuickFit API",
        lifespan=lifespan,
        debug=cfg.debug,
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
        generate_unique_id_function=custom_operation_id,
    )

    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_middleware(DbSessionMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://localhost(:[0-9]+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    register_routers(app)
    return app


def register_routers(app: FastAPI):
    api_router = APIRouter(prefix="/api")
    api_router.include_router(health_router.router)
    api_router.include_router(auth_router.router)
    api_router.include_router(plan_router.router)
    api_router.include_router(plan_session_router.router)
    api_router.include_router(plan_share_router.router)
    api_router.include_router(exercise_router.router)
    api_router.include_router(workout_log_router.router)
    api_router.include_router(friend_router.router)
    api_router.include_router(google_health_router.router)
    app.include_router(api_router)
