"""make set_log unique constraint deferrable

Revision ID: 4b46226ee896
Revises: a3d32206a616
Create Date: 2026-07-12 21:57:24.376895

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b46226ee896'
down_revision: Union[str, Sequence[str], None] = 'a3d32206a616'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.drop_constraint("uq_set_logs_log_exercise_index", "set_logs", type_="unique")
    op.create_unique_constraint(
        "uq_set_logs_log_exercise_index",
        "set_logs",
        ["workout_log_id", "exercise_id", "set_index"],
        deferrable=True,
        initially="IMMEDIATE",
    )


def downgrade() -> None:
    op.drop_constraint("uq_set_logs_log_exercise_index", "set_logs", type_="unique")
    op.create_unique_constraint(
        "uq_set_logs_log_exercise_index",
        "set_logs",
        ["workout_log_id", "exercise_id", "set_index"],
    )
