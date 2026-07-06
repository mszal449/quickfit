"""seed base exercises

Revision ID: d8f3a91c4b76
Revises: 0a67276946ca
Create Date: 2026-07-06 12:00:00.000000

"""
import json
import uuid
from pathlib import Path
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd8f3a91c4b76'
down_revision: Union[str, Sequence[str], None] = '0a67276946ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "base_exercises.json"


def _sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def upgrade() -> None:
    exercises = json.loads(_DATA_FILE.read_text())
    values = []
    for exercise in exercises:
        muscle_group = exercise["muscle_group"]
        muscle_group_sql = _sql_literal(muscle_group) if muscle_group else "NULL"
        values.append(
            f"({_sql_literal(str(uuid.uuid4()))}, NULL, {_sql_literal(exercise['name'])}, "
            f"{_sql_literal(exercise['category'])}, {muscle_group_sql}, false, now(), now())"
        )
    op.execute(
        "INSERT INTO exercises "
        "(id, owner_id, name, category, muscle_group, is_archived, created_at, updated_at) "
        "VALUES " + ", ".join(values)
    )


def downgrade() -> None:
    exercises = json.loads(_DATA_FILE.read_text())
    names = ", ".join(_sql_literal(exercise["name"]) for exercise in exercises)
    op.execute(f"DELETE FROM exercises WHERE owner_id IS NULL AND name IN ({names})")
