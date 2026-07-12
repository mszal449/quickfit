import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.model_base import BaseModel

if TYPE_CHECKING:
    from models.exercise import Exercise
    from models.workout_log import WorkoutLog


class SetLog(BaseModel):
    __tablename__ = "set_logs"
    __table_args__ = (
        UniqueConstraint(
            "workout_log_id", "exercise_id", "set_index", name="uq_set_logs_log_exercise_index"
        ),
    )

    workout_log_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workout_logs.id", ondelete="CASCADE"), index=True
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exercises.id"), index=True)
    # 0-based index of the set within its exercise (per-exercise, not global per workout)
    set_index: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # strength
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)

    # cardio
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    distance_m: Mapped[float | None] = mapped_column(Float, nullable=True)

    completed: Mapped[bool] = mapped_column(Boolean, default=True)

    workout_log: Mapped["WorkoutLog"] = relationship(back_populates="sets")
    exercise: Mapped["Exercise"] = relationship()
