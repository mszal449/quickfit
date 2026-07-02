import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models.friendship import FriendshipStatus


class FriendRequestCreate(BaseModel):
    email: EmailStr = Field(description="Email of the user to send a friend request to")


class FriendUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str


class FriendshipOut(BaseModel):
    id: uuid.UUID
    requester_id: uuid.UUID
    addressee_id: uuid.UUID
    status: FriendshipStatus
    created_at: datetime
    user: FriendUserOut = Field(description="The other party in this friendship")


class FriendshipFilterParams(BaseModel):
    status: FriendshipStatus | None = Field(default=None, description="Filter by status")
