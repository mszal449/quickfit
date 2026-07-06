import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from models.user import UserRole


class AccessToken(BaseModel):
    sub: uuid.UUID
    iat: datetime
    exp: datetime
    type: Literal["access"] = "access"

    def to_claims(self) -> dict:
        return {
            "sub": str(self.sub),
            "iat": int(self.iat.timestamp()),
            "exp": int(self.exp.timestamp()),
            "type": self.type,
        }


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str | None
    role: UserRole
    is_email_verified: bool
    created_at: datetime
    last_login_at: datetime | None


class GoogleUserInfo(BaseModel):
    sub: str
    email: str
    email_verified: bool
    name: str | None = None
