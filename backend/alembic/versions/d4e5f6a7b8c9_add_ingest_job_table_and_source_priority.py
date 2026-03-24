"""Add ingest_jobs table and source_priority column on manual_chunks

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # --- ingest_jobs table (replaces in-memory _jobs dict) ---
    if not conn.dialect.has_table(conn, 'ingest_jobs'):
        op.create_table(
            'ingest_jobs',
            sa.Column('job_id', sa.String(36), primary_key=True),
            sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
            sa.Column('stage', sa.String(50), nullable=False, server_default='queued'),
            sa.Column('chunks_indexed', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('gaps_filled', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('error', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # --- source_priority column on manual_chunks (skip if already present) ---
    has_col = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='manual_chunks' AND column_name='source_priority'"
    )).fetchone()
    if not has_col:
        op.add_column(
            'manual_chunks',
            sa.Column('source_priority', sa.Integer(), nullable=False, server_default='0'),
        )

    # Backfill existing rows based on data_source value
    op.execute("""
        UPDATE manual_chunks SET source_priority = CASE data_source
            WHEN 'user_uploaded'   THEN 5
            WHEN 'charm_li_vision' THEN 4
            WHEN 'charm_li_image'  THEN 3
            WHEN 'charm_li'        THEN 2
            WHEN 'charm_li_stub'   THEN 2
            WHEN 'gap_filled_ai'   THEN 1
            ELSE 0
        END
    """)


def downgrade() -> None:
    op.drop_column('manual_chunks', 'source_priority')
    op.drop_table('ingest_jobs')
