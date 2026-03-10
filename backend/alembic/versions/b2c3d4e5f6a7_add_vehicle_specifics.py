"""Add vehicle specifics: drive_type, body_style, doors, engine_displacement_l, engine_cylinders

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('vehicles', sa.Column('drive_type',            sa.String(50),  nullable=True))
    op.add_column('vehicles', sa.Column('body_style',            sa.String(100), nullable=True))
    op.add_column('vehicles', sa.Column('doors',                 sa.Integer(),   nullable=True))
    op.add_column('vehicles', sa.Column('engine_displacement_l', sa.Float(),     nullable=True))
    op.add_column('vehicles', sa.Column('engine_cylinders',      sa.Integer(),   nullable=True))


def downgrade() -> None:
    op.drop_column('vehicles', 'engine_cylinders')
    op.drop_column('vehicles', 'engine_displacement_l')
    op.drop_column('vehicles', 'doors')
    op.drop_column('vehicles', 'body_style')
    op.drop_column('vehicles', 'drive_type')
