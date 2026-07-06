import uuid

from pydantic import BaseModel, ConfigDict, Field, model_validator

from models.exercise import ExerciseCategory, MuscleGroup


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID | None
    name: str
    description: str | None
    category: ExerciseCategory
    muscle_group: MuscleGroup | None


class ExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category: ExerciseCategory = ExerciseCategory.STRENGTH
    muscle_group: MuscleGroup | None = Field(
        default=None, description="Required for strength exercises; ignored for cardio"
    )

    @model_validator(mode="after")
    def _check_muscle_group(self) -> "ExerciseCreate":
        if self.category == ExerciseCategory.STRENGTH and self.muscle_group is None:
            raise ValueError("muscle_group is required for strength exercises")
        if self.category == ExerciseCategory.CARDIO:
            self.muscle_group = None
        return self


class ExerciseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(
        default=None, description="Omit to keep as-is; send null to clear"
    )
    category: ExerciseCategory | None = Field(default=None, description="Leave unset to keep as-is")
    muscle_group: MuscleGroup | None = Field(
        default=None, description="Omit to keep as-is; send null to clear"
    )

    @model_validator(mode="after")
    def _check_muscle_group(self) -> "ExerciseUpdate":
        if self.category == ExerciseCategory.CARDIO:
            self.muscle_group = None
        return self
