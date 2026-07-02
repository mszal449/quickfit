"""add friendship model

Revision ID: 9c1f4a7d3e6b
Revises: c97285a25f9f
Create Date: 2026-07-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c1f4a7d3e6b'
down_revision: Union[str, Sequence[str], None] = 'c97285a25f9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('friendships',
    sa.Column('requester_id', sa.UUID(), nullable=False),
    sa.Column('addressee_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', name='friendshipstatus'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.CheckConstraint('requester_id != addressee_id', name='ck_friendships_no_self_friend'),
    sa.ForeignKeyConstraint(['addressee_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('requester_id', 'addressee_id', name='uq_friendships_requester_addressee')
    )
    op.create_index(op.f('ix_friendships_addressee_id'), 'friendships', ['addressee_id'], unique=False)
    op.create_index(op.f('ix_friendships_requester_id'), 'friendships', ['requester_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_friendships_requester_id'), table_name='friendships')
    op.drop_index(op.f('ix_friendships_addressee_id'), table_name='friendships')
    op.drop_table('friendships')
