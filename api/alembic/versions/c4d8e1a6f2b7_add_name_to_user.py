"""add name to user

Revision ID: c4d8e1a6f2b7
Revises: b3e7a2f5c9d1
Create Date: 2026-07-06 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c4d8e1a6f2b7'
down_revision: Union[str, Sequence[str], None] = 'b3e7a2f5c9d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'name')
