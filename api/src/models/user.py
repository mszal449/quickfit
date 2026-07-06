import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.model_base import BaseModel


class UserRole(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class AuthProvider(enum.StrEnum):
    GOOGLE = "google"


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.USER)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_plan_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plans.id", ondelete="SET NULL"), index=True, nullable=True
    )

    identities: Mapped[list["AuthIdentity"]] = relationship(back_populates="user")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=True
    )


class AuthIdentity(BaseModel):
    __tablename__ = "auth_identities"
    __table_args__ = (UniqueConstraint("provider", "provider_account_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[AuthProvider] = mapped_column(
        SAEnum(AuthProvider), default=AuthProvider.GOOGLE
    )
    provider_account_id: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )

    user: Mapped["User"] = relationship(back_populates="identities")
