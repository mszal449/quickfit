import uuid

from pydantic import BaseModel, Field


class ExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ExerciseOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: str | None
