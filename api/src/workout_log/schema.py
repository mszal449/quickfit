import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from models.workout_log import WorkoutLogStatus


def _check_unique_exercises(exercises: list["ExerciseLogEntry"]) -> list["ExerciseLogEntry"]:
    exercise_ids = [e.exercise_id for e in exercises]
    if len(exercise_ids) != len(set(exercise_ids)):
        raise ValueError("Each exercise can appear at most once per workout log")
    return exercises


class SetLogEntry(BaseModel):
    reps: int | None = Field(default=None, ge=0, description="Repetitions performed")
    weight: float | None = Field(
        default=None,
        description="Weight used, in kg. Negative values represent assistance "
        "(e.g. a resistance band reducing effective bodyweight).",
    )
    duration_seconds: int | None = Field(default=None, gt=0, description="Duration, for cardio")
    distance_m: float | None = Field(default=None, gt=0, description="Distance, for cardio")
    completed: bool = Field(default=True, description="Whether the set was completed as logged")
    notes: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def _check_has_metric(self) -> "SetLogEntry":
        if self.reps is None and self.duration_seconds is None:
            raise ValueError("A set must record at least reps or duration_seconds")
        return self


class AddSetRequest(SetLogEntry):
    exercise_id: uuid.UUID = Field(description="Exercise ID")


class SetLogUpdate(BaseModel):
    reps: int | None = Field(
        default=None, ge=0, description="Omit to keep as-is; send null to clear"
    )
    weight: float | None = Field(
        default=None,
        description="Weight used, in kg (negative = assisted). Omit to keep as-is; "
        "send null to clear",
    )
    duration_seconds: int | None = Field(
        default=None, gt=0, description="Omit to keep as-is; send null to clear"
    )
    distance_m: float | None = Field(
        default=None, gt=0, description="Omit to keep as-is; send null to clear"
    )
    completed: bool | None = Field(default=None, description="Leave unset to keep as-is")
    notes: str | None = Field(
        default=None, min_length=1, description="Omit to keep as-is; send null to clear"
    )


class SetLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    exercise_id: uuid.UUID
    set_index: int
    reps: int | None
    weight: float | None
    duration_seconds: int | None
    distance_m: float | None
    completed: bool
    notes: str | None


class ExerciseLogEntry(BaseModel):
    exercise_id: uuid.UUID = Field(description="Exercise ID")
    sets: list[SetLogEntry] = Field(description="Sets logged for this exercise", min_length=1)


class WorkoutLogCreate(BaseModel):
    plan_session_id: uuid.UUID | None = Field(
        default=None, description="Plan session this workout was performed against, if any"
    )
    performed_at: datetime | None = Field(
        default=None, description="When the workout happened; defaults to now"
    )
    notes: str | None = Field(default=None, min_length=1)
    exercises: list[ExerciseLogEntry] = Field(
        default_factory=list,
        description="Sets logged so far. Can be empty — clients may start an "
        "in-progress workout and append sets incrementally via POST .../set.",
    )

    @field_validator("exercises")
    @classmethod
    def _check_unique(cls, v: list[ExerciseLogEntry]) -> list[ExerciseLogEntry]:
        return _check_unique_exercises(v)


class WorkoutLogUpdate(BaseModel):
    performed_at: datetime | None = Field(default=None, description="Leave unset to keep as-is")
    notes: str | None = Field(
        default=None, min_length=1, description="Omit to keep as-is; send null to clear"
    )
    status: WorkoutLogStatus | None = Field(default=None, description="Leave unset to keep as-is")
    exercises: list[ExerciseLogEntry] | None = Field(
        default=None,
        description="If provided, fully replaces the workout's logged sets.",
    )

    @field_validator("exercises")
    @classmethod
    def _check_unique(cls, v: list[ExerciseLogEntry] | None) -> list[ExerciseLogEntry] | None:
        return _check_unique_exercises(v) if v is not None else v


class WorkoutLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    plan_id: uuid.UUID | None
    plan_session_id: uuid.UUID | None
    status: WorkoutLogStatus
    performed_at: datetime
    notes: str | None
    sets: list[SetLogOut]


class WorkoutLogFilterParams(BaseModel):
    status: WorkoutLogStatus | None = Field(
        default=None, description="Filter by workout log status"
    )
    plan_id: uuid.UUID | None = Field(default=None, description="Filter by plan")
