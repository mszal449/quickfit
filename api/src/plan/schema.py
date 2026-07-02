import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models.plan import PlanVisibility


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: str | None
    visibility: PlanVisibility
    created_at: datetime


class PlanCreate(BaseModel):
    name: str
    description: str | None
    visibility: PlanVisibility = PlanVisibility.PRIVATE


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, description="Leave unset to keep as-is")
    description: str | None = Field(
        default=None, description="Omit to keep as-is; send null to clear"
    )
    visibility: PlanVisibility | None = Field(default=None, description="Leave unset to keep as-is")


class PlanFilterParams(BaseModel):
    shared_with_me: bool = Field(
        default=False, description="If True, returns plans shared with the authenticated user"
    )
    shared_by_user_id: uuid.UUID | None = Field(
        default=None, description="Filters plans shared with authenticated user"
    )
