import uuid

from pydantic import BaseModel, ConfigDict

from plan_session.prescription import SessionPrescription


class PlanSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_id: uuid.UUID
    name: str
    prescription: SessionPrescription
    schema_version: int


class PlanSessionCreate(BaseModel):
    name: str
    prescription: SessionPrescription
