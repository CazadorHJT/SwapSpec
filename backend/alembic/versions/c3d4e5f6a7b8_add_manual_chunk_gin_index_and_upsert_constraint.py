"""Add manual_chunk GIN index and upsert unique constraint

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Unique constraint for atomic upsert via INSERT ON CONFLICT DO UPDATE.
    # engine_id and transmission_id are nullable — use COALESCE for NULL-safe uniqueness.
    op.execute("""
        CREATE UNIQUE INDEX uq_manual_chunk_key ON manual_chunks (
            vehicle_make, vehicle_model, vehicle_year, section_path, scope,
            COALESCE(engine_id, ''),
            COALESCE(transmission_id, '')
        )
    """)

    # GIN index for full-text search — critical for performance at 100K+ chunks.
    op.execute("""
        CREATE INDEX idx_manual_chunks_content_fts
        ON manual_chunks USING GIN (to_tsvector('english', content))
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_manual_chunk_key")
    op.execute("DROP INDEX IF EXISTS idx_manual_chunks_content_fts")
