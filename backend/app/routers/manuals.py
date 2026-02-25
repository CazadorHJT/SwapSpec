from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.manual_chunk import ManualChunk
from app.schemas.manual import (
    IngestStatusResponse,
    LocalManualIngestRequest,
    ManualChunkResponse,
    ManualIngestRequest,
    ManualSearchResponse,
)
from app.services.manual_ingestor import ManualIngestor
from app.utils.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/manuals", tags=["Manuals"])
_ingestor = ManualIngestor()


@router.post("/ingest", response_model=IngestStatusResponse)
async def ingest_manual(
    request: ManualIngestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Trigger download + indexing of a vehicle manual from charm.li.

    Returns immediately with a job_id if not already indexed, or
    status='already_indexed' if chunks already exist.
    """
    # Check if already indexed
    count_result = await db.execute(
        select(func.count(ManualChunk.id)).where(
            and_(
                ManualChunk.vehicle_make == request.make,
                ManualChunk.vehicle_model == request.model,
                ManualChunk.vehicle_year == request.year,
            )
        )
    )
    existing_count = count_result.scalar() or 0

    if existing_count > 0:
        return IngestStatusResponse(
            job_id=None,
            status="already_indexed",
            stage="done",
            chunks_indexed=existing_count,
            gaps_filled=0,
        )

    job_id = await _ingestor.start_ingest(
        request.year, request.make, request.model, request.vehicle_id, db
    )
    background_tasks.add_task(
        _ingestor.run_pipeline,
        job_id,
        request.year,
        request.make,
        request.model,
        request.vehicle_id,
        db,
    )
    return IngestStatusResponse(
        job_id=job_id,
        status="pending",
        stage="queued",
        chunks_indexed=0,
        gaps_filled=0,
    )


@router.post("/ingest/local", response_model=IngestStatusResponse)
async def ingest_local_manual(
    request: LocalManualIngestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Trigger indexing from a local manual directory (already downloaded/extracted)."""
    job_id = await _ingestor.start_local_ingest(
        request.manual_dir,
        request.make,
        request.model,
        request.year,
        request.vehicle_id,
        db,
    )
    background_tasks.add_task(
        _ingestor.run_pipeline,
        job_id,
        request.year,
        request.make,
        request.model,
        request.vehicle_id,
        db,
        manual_dir_override=request.manual_dir,
    )
    return IngestStatusResponse(
        job_id=job_id,
        status="pending",
        stage="queued",
        chunks_indexed=0,
        gaps_filled=0,
    )


@router.get("/status/{job_id}", response_model=IngestStatusResponse)
async def get_ingest_status(
    job_id: str,
    current_user=Depends(get_current_user),
):
    """Poll ingest job status."""
    job = _ingestor.get_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return IngestStatusResponse(
        job_id=job.job_id,
        status=job.status,
        stage=job.stage,
        chunks_indexed=job.chunks_indexed,
        gaps_filled=job.gaps_filled,
        error=job.error,
    )


@router.get("/search", response_model=ManualSearchResponse)
async def search_manual_chunks(
    q: str,
    make: str,
    model: str,
    year: int,
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Full-text search over indexed manual chunks for a specific vehicle."""
    from sqlalchemy import text as sql_text

    # Try PostgreSQL FTS; fall back to ILIKE for SQLite (tests)
    try:
        stmt = (
            select(ManualChunk)
            .where(
                and_(
                    ManualChunk.vehicle_make == make,
                    ManualChunk.vehicle_model == model,
                    ManualChunk.vehicle_year == year,
                    func.to_tsvector("english", ManualChunk.content).op("@@")(
                        func.plainto_tsquery("english", q)
                    ),
                )
            )
            .order_by(
                func.ts_rank(
                    func.to_tsvector("english", ManualChunk.content),
                    func.plainto_tsquery("english", q),
                ).desc()
            )
            .limit(limit)
        )
        result = await db.execute(stmt)
        chunks = result.scalars().all()
    except Exception:
        # SQLite fallback (tests / local dev without PostgreSQL)
        stmt = (
            select(ManualChunk)
            .where(
                and_(
                    ManualChunk.vehicle_make == make,
                    ManualChunk.vehicle_model == model,
                    ManualChunk.vehicle_year == year,
                    ManualChunk.content.ilike(f"%{q}%"),
                )
            )
            .limit(limit)
        )
        result = await db.execute(stmt)
        chunks = result.scalars().all()

    return ManualSearchResponse(
        chunks=[ManualChunkResponse.model_validate(c) for c in chunks],
        total=len(chunks),
    )


@router.get("/chunks/{vehicle_id}", response_model=ManualSearchResponse)
async def list_chunks_for_vehicle(
    vehicle_id: str,
    offset: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """List all indexed chunks for a vehicle_id, paginated."""
    count_result = await db.execute(
        select(func.count(ManualChunk.id)).where(
            ManualChunk.vehicle_id == vehicle_id
        )
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(ManualChunk)
        .where(ManualChunk.vehicle_id == vehicle_id)
        .order_by(ManualChunk.section_path)
        .offset(offset)
        .limit(limit)
    )
    chunks = result.scalars().all()

    return ManualSearchResponse(
        chunks=[ManualChunkResponse.model_validate(c) for c in chunks],
        total=total,
    )
