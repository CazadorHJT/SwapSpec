"""add admin role and catalog quality status

Revision ID: aeb58a5f361c
Revises: a1b2c3d4e5f7
Create Date: 2026-04-02 23:12:32.381820

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aeb58a5f361c'
down_revision: Union[str, None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # qualitystatus enum already exists from vehicles migration — reuse it
    quality_status_enum = sa.Enum('pending', 'approved', 'rejected', name='qualitystatus', create_type=False)
    # userrole is new — must create the type first
    userrole_enum = sa.Enum('user', 'admin', name='userrole')
    userrole_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('engines', sa.Column('quality_status', quality_status_enum, server_default='approved', nullable=False))
    op.add_column('engines', sa.Column('contributor_id', sa.String(length=36), nullable=True))
    op.create_foreign_key(None, 'engines', 'users', ['contributor_id'], ['id'])
    op.add_column('transmissions', sa.Column('quality_status', quality_status_enum, server_default='approved', nullable=False))
    op.add_column('transmissions', sa.Column('contributor_id', sa.String(length=36), nullable=True))
    op.create_foreign_key(None, 'transmissions', 'users', ['contributor_id'], ['id'])
    op.add_column('users', sa.Column('role', sa.Enum('user', 'admin', name='userrole', create_type=False), server_default='user', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'role')
    op.execute("DROP TYPE IF EXISTS userrole")
    op.drop_constraint(None, 'transmissions', type_='foreignkey')
    op.drop_column('transmissions', 'contributor_id')
    op.drop_column('transmissions', 'quality_status')
    op.drop_constraint(None, 'engines', type_='foreignkey')
    op.drop_column('engines', 'contributor_id')
    op.drop_column('engines', 'quality_status')
