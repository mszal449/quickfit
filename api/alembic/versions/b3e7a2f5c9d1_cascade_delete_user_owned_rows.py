"""cascade delete user owned rows

Revision ID: b3e7a2f5c9d1
Revises: d8f3a91c4b76
Create Date: 2026-07-06 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b3e7a2f5c9d1'
down_revision: Union[str, Sequence[str], None] = 'd8f3a91c4b76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_USER_FKS = [
    ("auth_identities_user_id_fkey", "auth_identities", "user_id"),
    ("refresh_tokens_user_id_fkey", "refresh_tokens", "user_id"),
    ("friendships_requester_id_fkey", "friendships", "requester_id"),
    ("friendships_addressee_id_fkey", "friendships", "addressee_id"),
    ("plan_shares_owner_id_fkey", "plan_shares", "owner_id"),
    ("plan_shares_shared_with_user_id_fkey", "plan_shares", "shared_with_user_id"),
    ("workout_logs_user_id_fkey", "workout_logs", "user_id"),
]


def upgrade() -> None:
    for name, table, column in _USER_FKS:
        op.drop_constraint(name, table, type_='foreignkey')
        op.create_foreign_key(name, table, 'users', [column], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    for name, table, column in _USER_FKS:
        op.drop_constraint(name, table, type_='foreignkey')
        op.create_foreign_key(name, table, 'users', [column], ['id'])
