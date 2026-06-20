
from fastapi import APIRouter, status
from structlog import get_logger

from config.service import get_config
from health.schemas import HealthResponse

LOG = get_logger()
config = get_config()
router = APIRouter(tags=["health"])

@router.get("/health", status_code=status.HTTP_200_OK, response_model=HealthResponse)
def health():
    return HealthResponse(status= "ok")