import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.model_base import BaseModel

if TYPE_CHECKING:
    from models.plan_session import PlanSession
    from models.plan_share import PlanShare


class PlanVisibility(enum.StrEnum):
    PRIVATE = "private"
    SHARED = "shared"


class Plan(BaseModel):
    __tablename__ = "plans"

    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    visibility: Mapped[PlanVisibility] = mapped_column(
        SAEnum(PlanVisibility), default=PlanVisibility.PRIVATE
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    sessions: Mapped[list["PlanSession"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
    )
    shares: Mapped[list["PlanShare"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
    )
