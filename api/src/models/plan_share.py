import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.model_base import BaseModel

if TYPE_CHECKING:
    from models.plan import Plan


class PlanShareStatus(enum.StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REVOKED = "revoked"


class PlanShare(BaseModel):
    __tablename__ = "plan_shares"
    __table_args__ = (
        UniqueConstraint(
            "plan_id", "shared_with_user_id", name="uq_plan_shares_plan_id_shared_with_user_id"
        ),
    )

    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("plans.id"), index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    shared_with_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[PlanShareStatus] = mapped_column(
        SAEnum(PlanShareStatus), default=PlanShareStatus.PENDING
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    plan: Mapped["Plan"] = relationship(back_populates="shares")
