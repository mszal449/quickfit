


import uuid

from pydantic import BaseModel, ConfigDict


class PlanSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_id: uuid.UUID
    name: str
    prescription: dict
    schema_version: int

class PlanSessionCreate(BaseModel):
    name: str
    prescription: dict = {}