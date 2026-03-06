"""Add manual scoping: origin fields on engines/transmissions, scope/engine_id/transmission_id on manual_chunks

Revision ID: a1b2c3d4e5f6
Revises: 8e125203e866
Create Date: 2026-03-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8e125203e866'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add donor-vehicle origin fields to engines
    op.add_column('engines', sa.Column('origin_year',  sa.Integer(),     nullable=True))
    op.add_column('engines', sa.Column('origin_make',  sa.String(100),   nullable=True))
    op.add_column('engines', sa.Column('origin_model', sa.String(100),   nullable=True))

    # Add donor-vehicle origin fields to transmissions
    op.add_column('transmissions', sa.Column('origin_year',  sa.Integer(),   nullable=True))
    op.add_column('transmissions', sa.Column('origin_make',  sa.String(100), nullable=True))
    op.add_column('transmissions', sa.Column('origin_model', sa.String(100), nullable=True))

    # Add scoping columns to manual_chunks
    op.add_column('manual_chunks', sa.Column('scope', sa.String(20), nullable=False, server_default='chassis'))
    op.add_column('manual_chunks', sa.Column('engine_id', sa.String(36), nullable=True))
    op.add_column('manual_chunks', sa.Column('transmission_id', sa.String(36), nullable=True))

    # Add foreign key constraints
    op.create_foreign_key(
        'fk_manual_chunks_engine_id',
        'manual_chunks', 'engines',
        ['engine_id'], ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_manual_chunks_transmission_id',
        'manual_chunks', 'transmissions',
        ['transmission_id'], ['id'],
        ondelete='SET NULL',
    )

    # Backfill: ensure all existing rows have scope='chassis'
    op.execute("UPDATE manual_chunks SET scope = 'chassis' WHERE scope IS NULL OR scope = ''")


def downgrade() -> None:
    op.drop_constraint('fk_manual_chunks_transmission_id', 'manual_chunks', type_='foreignkey')
    op.drop_constraint('fk_manual_chunks_engine_id', 'manual_chunks', type_='foreignkey')
    op.drop_column('manual_chunks', 'transmission_id')
    op.drop_column('manual_chunks', 'engine_id')
    op.drop_column('manual_chunks', 'scope')
    op.drop_column('transmissions', 'origin_model')
    op.drop_column('transmissions', 'origin_make')
    op.drop_column('transmissions', 'origin_year')
    op.drop_column('engines', 'origin_model')
    op.drop_column('engines', 'origin_make')
    op.drop_column('engines', 'origin_year')
