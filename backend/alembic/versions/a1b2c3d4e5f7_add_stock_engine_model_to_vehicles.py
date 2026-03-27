"""Add stock_engine_model to vehicles

Revision ID: a1b2c3d4e5f7
Revises: f6a7b8c9d0e1
Create Date: 2026-03-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
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

    if not has_column("vehicles", "stock_engine_model"):
        op.add_column("vehicles", sa.Column("stock_engine_model", sa.String(100), nullable=True))

    # Backfill known seeded vehicles
    op.execute("""
        UPDATE vehicles SET stock_engine_model = '1.6L BP-4W'
        WHERE make = 'Mazda' AND model = 'Miata' AND year = 1990
    """)
    op.execute("""
        UPDATE vehicles SET stock_engine_model = '3.0L 2JZ-GE'
        WHERE make = 'Toyota' AND model = 'Supra' AND year = 1993
    """)
    op.execute("""
        UPDATE vehicles SET stock_engine_model = '5.7L LS1'
        WHERE make = 'Chevrolet' AND model = 'Camaro' AND year = 1998
    """)
    op.execute("""
        UPDATE vehicles SET stock_engine_model = '3.0L 3VZ-E'
        WHERE make = 'Toyota' AND model = '4Runner' AND year = 1993
    """)


def downgrade() -> None:
    op.drop_column("vehicles", "stock_engine_model")
