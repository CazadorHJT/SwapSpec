"""Shared full-text search helper for ManualChunk queries.

Provides a single implementation of the PostgreSQL FTS pattern (with ILIKE
fallback for SQLite in tests) used by the advisor tool-use loop, the Gemini
pre-fetch RAG path, and the public /api/manuals/search endpoint.
"""
from __future__ import annotations

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.manual_chunk import ManualChunk


async def search_chunks(
    db: AsyncSession,
    query: str,
    scope_filter,
    limit: int = 5,
) -> list[ManualChunk]:
    """Full-text search over ManualChunk rows matching scope_filter.

    Args:
        db: Active async DB session.
        query: Natural-language search query.
        scope_filter: A SQLAlchemy WHERE clause fragment (e.g. from and_(...))
            that restricts results to the correct scope/component. Pass
            ``None`` to search without a scope restriction.
        limit: Maximum number of chunks to return.

    Returns:
        List of ManualChunk rows ranked by FTS relevance.
    """
    base_where = scope_filter if scope_filter is not None else True

    # --- PostgreSQL FTS path ---
    try:
        fts_condition = func.to_tsvector("english", ManualChunk.content).op("@@")(
            func.plainto_tsquery("english", query)
        )
        stmt = (
            select(ManualChunk)
            .where(and_(base_where, fts_condition))
            .order_by(
                func.ts_rank(
                    func.to_tsvector("english", ManualChunk.content),
                    func.plainto_tsquery("english", query),
                ).desc()
            )
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
    except Exception:
        pass

    # --- ILIKE fallback (SQLite / FTS failure) ---
    try:
        stmt = (
            select(ManualChunk)
            .where(and_(base_where, ManualChunk.content.ilike(f"%{query}%")))
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
    except Exception:
        return []
