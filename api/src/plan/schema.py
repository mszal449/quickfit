import uuid

from pydantic import BaseModel, ConfigDict, Field

from models.plan import PlanVisibility


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: str | None
    visibility: PlanVisibility


class PlanCreate(BaseModel):
    name: str
    description: str | None
    visibility: PlanVisibility = PlanVisibility.PRIVATE


class PlanFilterParams(BaseModel):
    shared_with_me: bool = Field(
        default=False, description="If True, returns plans shared with the authenticated user"
    )
    shared_by_user_id: uuid.UUID | None = Field(
        default=None, description="Filters plans shared with authenticated user"
    )
