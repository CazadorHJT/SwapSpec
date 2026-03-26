"""Add engine_family, origin_variant, and stock_transmission_model

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
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

    # --- engines: engine_family ---
    if not has_column("engines", "engine_family"):
        op.add_column("engines", sa.Column("engine_family", sa.String(50), nullable=True))
        op.create_index("ix_engines_engine_family", "engines", ["engine_family"])

    # --- engines: origin_variant ---
    if not has_column("engines", "origin_variant"):
        op.add_column("engines", sa.Column("origin_variant", sa.String(100), nullable=True))

    # --- transmissions: origin_variant ---
    if not has_column("transmissions", "origin_variant"):
        op.add_column("transmissions", sa.Column("origin_variant", sa.String(100), nullable=True))

    # --- vehicles: stock_transmission_model ---
    if not has_column("vehicles", "stock_transmission_model"):
        op.add_column("vehicles", sa.Column("stock_transmission_model", sa.String(100), nullable=True))

    # --- Backfill engine families ---
    op.execute("UPDATE engines SET engine_family = 'LS' WHERE model IN ('LS1', 'LS3')")
    op.execute("UPDATE engines SET engine_family = '2JZ' WHERE model LIKE '2JZ%'")
    op.execute("UPDATE engines SET engine_family = 'RB' WHERE model LIKE 'RB%'")
    op.execute("UPDATE engines SET engine_family = 'Coyote' WHERE model = 'Coyote'")
    op.execute("UPDATE engines SET engine_family = 'HEMI' WHERE model = 'HEMI'")

    # --- Backfill origin_variant (use model code by default) ---
    op.execute("UPDATE engines SET origin_variant = model WHERE origin_variant IS NULL")
    op.execute("UPDATE transmissions SET origin_variant = model WHERE origin_variant IS NULL")

    # --- Backfill stock_transmission_model for seeded vehicles ---
    op.execute("""
        UPDATE vehicles SET stock_transmission_model = 'Mazda M15M-D 5-speed'
        WHERE model = 'Miata' AND year = 1990
    """)
    op.execute("""
        UPDATE vehicles SET stock_transmission_model = 'Muncie M21 4-speed'
        WHERE model = 'Camaro' AND year = 1969
    """)
    op.execute("""
        UPDATE vehicles SET stock_transmission_model = 'TorqueFlite A727 3-speed'
        WHERE model = 'Challenger' AND year = 1970
    """)
    op.execute("""
        UPDATE vehicles SET stock_transmission_model = 'Ford C4 3-speed auto'
        WHERE model = 'Mustang' AND year = 1967
    """)
    op.execute("""
        UPDATE vehicles SET stock_transmission_model = 'Nissan FS5W71C 5-speed'
        WHERE model = '240SX' AND year = 1989
    """)
    op.execute("""
        UPDATE vehicles SET stock_transmission_model = 'Toyota V160 6-speed'
        WHERE model = 'Supra' AND year = 1995
    """)
    op.execute("""
        UPDATE vehicles SET stock_transmission_model = 'Tremec T-3650 5-speed'
        WHERE model = 'Mustang' AND year = 2005
    """)


def downgrade() -> None:
    op.drop_index("ix_engines_engine_family", table_name="engines")
    op.drop_column("engines", "engine_family")
    op.drop_column("engines", "origin_variant")
    op.drop_column("transmissions", "origin_variant")
    op.drop_column("vehicles", "stock_transmission_model")
