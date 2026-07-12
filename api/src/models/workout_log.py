import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.model_base import BaseModel

if TYPE_CHECKING:
    from models.set_log import SetLog


class WorkoutLogStatus(enum.StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class WorkoutLog(BaseModel):
    __tablename__ = "workout_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plans.id", ondelete="SET NULL"), index=True, nullable=True
    )
    plan_session_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plan_sessions.id", ondelete="SET NULL"), index=True, nullable=True
    )
    status: Mapped[WorkoutLogStatus] = mapped_column(
        SAEnum(WorkoutLogStatus), default=WorkoutLogStatus.IN_PROGRESS, index=True
    )
    synchronized: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, index=True
    )
    sync_datapoint_name: Mapped[str | None] = mapped_column(
        String(512), nullable=True, unique=True, default=None
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    sets: Mapped[list["SetLog"]] = relationship(
        back_populates="workout_log",
        cascade="all, delete-orphan",
        order_by="(SetLog.exercise_id, SetLog.set_index)",
    )
