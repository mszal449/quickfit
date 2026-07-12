from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    scope: str
    expires_in: int
    token_type: str


class IntegrationStatusOut(BaseModel):
    connected: bool
    scope_granted: str | None = None
    created_at: datetime | None = None


class GoogleHealthModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ExerciseInterval(GoogleHealthModel):
    start_time: datetime
    end_time: datetime
    start_utc_offset: str | None = None
    end_utc_offset: str | None = None


class Exercise(GoogleHealthModel):
    exercise_type: str
    interval: ExerciseInterval
    display_name: str | None = None
    active_duration: str | None = None
    notes: str | None = None


class ExerciseDataPoint(GoogleHealthModel):
    name: str
    exercise: Exercise
