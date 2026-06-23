from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from structlog import get_logger

from auth import router as auth_router
from common.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from config.db import close_db, init_db
from config.middleware import DbSessionMiddleware
from config.service import get_config
from exercise import router as exercise_router
from health import router as health_router

LOG = get_logger()

_STATUS_BY_EXCEPTION: dict[type[AppError], int] = {
    NotFoundError: status.HTTP_404_NOT_FOUND,
    ConflictError: status.HTTP_409_CONFLICT,
    ForbiddenError: status.HTTP_403_FORBIDDEN,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db(get_config().db_config)
    yield
    await close_db()


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    code = _STATUS_BY_EXCEPTION.get(type(exc), status.HTTP_400_BAD_REQUEST)
    return JSONResponse(status_code=code, content={"detail": str(exc)})


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    LOG.exception("unhandled_exception", path=request.url.path, method=request.method)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Something went wrong. Please try again later."},
    )


def create_app():
    cfg = get_config()
    app = FastAPI(
        title="quickfit-api",
        description="QuickFit API",
        lifespan=lifespan,
        debug=cfg.debug,
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
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
    register_routers(app)
    return app


def register_routers(app: FastAPI):
    api_router = APIRouter(prefix="/api")
    api_router.include_router(health_router.router)
    api_router.include_router(auth_router.router)
    api_router.include_router(exercise_router.router)
    app.include_router(api_router)
