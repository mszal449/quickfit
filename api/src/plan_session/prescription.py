from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class SetPrescription(BaseModel):
    min_reps: int = Field(description="Minimum or target rep count", ge=0)
    max_reps: int | None = Field(default=None, description="Upper bound of the rep range")

    @model_validator(mode="after")
    def _check_range(self) -> "SetPrescription":
        if self.max_reps is not None and self.max_reps < self.min_reps:
            raise ValueError("Max reps must be greater or equal to min reps")
        return self


class ExercisePrescription(BaseModel):
    exercise_id: UUID = Field(description="Exercise ID")
    sets: list[SetPrescription] = Field(description="Sets of the given exercise", min_length=1)
    description: str | None = Field(default=None, min_length=1, description="Description")


class SessionPrescription(BaseModel):
    exercises: list[ExercisePrescription] = Field(description="Workout exercises", min_length=1)

    @model_validator(mode="after")
    def _check_unique_exercises(self) -> "SessionPrescription":
        exercise_ids = [e.exercise_id for e in self.exercises]
        if len(exercise_ids) != len(set(exercise_ids)):
            raise ValueError("Each exercise can appear at most once per session")
        return self
