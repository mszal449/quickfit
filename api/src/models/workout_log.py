
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.model_base import BaseModel

if TYPE_CHECKING:
    from models.set_log import SetLog


class WorkoutLog(BaseModel):
    __tablename__ = "workout_logs"
    
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plans.id", ondelete="SET NULL"), index=True, nullable=True
    )
    plan_session_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plan_sessions.id", ondelete="SET NULL"), index=True, nullable=True
    )
    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    sets: Mapped[list["SetLog"]] = relationship(
        back_populates="workout_log",
        cascade="all, delete-orphan",
        order_by="SetLog.set_index"
    )
