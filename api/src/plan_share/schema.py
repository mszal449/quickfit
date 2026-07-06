import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models.plan_share import PlanShareStatus


class PlanShareCreate(BaseModel):
    plan_id: uuid.UUID = Field(description="Plan to share")
    shared_with_user_id: uuid.UUID = Field(description="Friend to share the plan with")


class PlanShareUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str


class PlanShareOut(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    plan_name: str
    owner_id: uuid.UUID
    shared_with_user_id: uuid.UUID
    status: PlanShareStatus
    created_at: datetime
    updated_at: datetime
    user: PlanShareUserOut = Field(description="The other party in this share")


class PlanShareFilterParams(BaseModel):
    plan_id: uuid.UUID | None = Field(default=None, description="Filter by plan")
    status: PlanShareStatus | None = Field(default=None, description="Filter by status")
