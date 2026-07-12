from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import httpx
from fastapi import status
from structlog import get_logger

from common.exceptions import ExternalServiceError
from google_health.schema import ExerciseDataPoint
from models.workout_log import WorkoutLog

GOOGLE_HEALTH_API_URL = "https://health.googleapis.com/v4"
STRENGTH_TRAINING_EXERCISE_TYPE = "STRENGTH_TRAINING"
STRENGTH_TRAINING_DISPLAY_NAME = "Strength training"
DATA_POINTS_URL = "/users/me/dataTypes/exercise/dataPoints"
LOG = get_logger()


def _utc_offset(dt: datetime) -> str:
    offset = dt.utcoffset() or timedelta(0)
    return f"{int(offset.total_seconds())}s"


class _BearerAuth(httpx.Auth):
    def __init__(self, token: str) -> None:
        self._token = token

    def auth_flow(self, request: httpx.Request):
        request.headers["Authorization"] = f"Bearer {self._token}"
        yield request


async def _log_request(request: httpx.Request) -> None:
    LOG.debug(
        "google_health_request",
        method=request.method,
        url=str(request.url),
        body=request.content.decode() or None,
    )


async def _log_response(response: httpx.Response) -> None:
    body = (await response.aread()).decode()
    LOG.debug(
        "google_health_response",
        method=response.request.method,
        url=str(response.request.url),
        status=response.status_code,
        body=body,
    )


async def _raise_on_error(response: httpx.Response) -> None:
    if response.status_code >= status.HTTP_400_BAD_REQUEST:
        body = (await response.aread()).decode()
        LOG.error("google_health_request_failed", body=body)
        raise ExternalServiceError("Google Health request failed", extra={"body": body})


class GoogleClient:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self._http = http

    async def list_datapoints(self, since: datetime | None = None) -> list[ExerciseDataPoint]:
        params: dict[str, str | int] = {"pageSize": 10}
        if since:
            params["filter"] = f'exercise.interval.civil_start_time >= "{since:%Y-%m-%dT%H:%M:%S}"'
        resp = await self._http.get(DATA_POINTS_URL, params=params)
        data_points = [
            ExerciseDataPoint.model_validate(dp) for dp in resp.json().get("dataPoints", [])
        ]
        return [
            dp for dp in data_points if dp.exercise.exercise_type == STRENGTH_TRAINING_EXERCISE_TYPE
        ]

    async def create_datapoint(self, workout_log: WorkoutLog, notes: str) -> ExerciseDataPoint:
        if workout_log.completed_at is None:
            raise ValueError("completed_at missing")
        body = {
            "exercise": {
                "exerciseType": STRENGTH_TRAINING_EXERCISE_TYPE,
                "displayName": STRENGTH_TRAINING_DISPLAY_NAME,
                "interval": {
                    "startTime": workout_log.started_at.isoformat(),
                    "endTime": workout_log.completed_at.isoformat(),
                    "startUtcOffset": _utc_offset(workout_log.started_at),
                    "endUtcOffset": _utc_offset(workout_log.completed_at),
                },
                "metricsSummary": {},
                "notes": notes,
            }
        }
        resp = await self._http.post(DATA_POINTS_URL, json=body)
        resp_body = resp.json()
        return ExerciseDataPoint.model_validate(resp_body)

    async def update_datapoint_notes(self, datapoint: ExerciseDataPoint, notes: str) -> None:
        await self._http.patch(
            f"/{datapoint.name}",
            params={"updateMask": "exercise.notes"},
            json={"name": datapoint.name, "exercise": {"notes": notes}},
        )


@asynccontextmanager
async def google_health_client(token: str) -> AsyncGenerator[GoogleClient]:
    async with httpx.AsyncClient(
        base_url=GOOGLE_HEALTH_API_URL,
        auth=_BearerAuth(token),
        event_hooks={"request": [_log_request], "response": [_log_response, _raise_on_error]},
    ) as http:
        yield GoogleClient(http)
