from contextlib import asynccontextmanager

from config.service import get_config
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.db import close_db, init_db
from pydantic import BaseModel

from health import router as health_router

class HealthResponse(BaseModel):
    status: str
    
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db(get_config().db_config)
    yield
    await close_db()

def create_app():
    cfg = get_config() 
    app = FastAPI(
        title="quickfit-api",
        description="QuickFit API",
        port=cfg.port,
        lifespan=lifespan, 
        debug=cfg.debug, 
        openapi_url="/api/openapi.json", 
        docs_url="/api/docs")
    
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
    app.include_router(api_router)
