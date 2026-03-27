"""Add drivetrain_type to transmissions

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-03-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    def has_column(table: str, column: str) -> bool:
        row = conn.execute(sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name=:t AND column_name=:c"
        ), {"t": table, "c": column}).fetchone()
        return row is not None

    if not has_column("transmissions", "drivetrain_type"):
        op.add_column("transmissions", sa.Column("drivetrain_type", sa.String(20), nullable=True))

    # Backfill known seeded transmissions
    op.execute("""
        UPDATE transmissions SET drivetrain_type = 'RWD'
        WHERE model IN ('T56 Magnum', 'TKX', 'T56 Magnum-F', 'R154', 'CD009')
    """)
    op.execute("""
        UPDATE transmissions SET drivetrain_type = 'RWD'
        WHERE model IN ('4L60E', '4L80E')
    """)


def downgrade() -> None:
    op.drop_column("transmissions", "drivetrain_type")
