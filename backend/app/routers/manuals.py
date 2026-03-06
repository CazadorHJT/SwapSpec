import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
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
    ManualUploadResponse,
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
    status='already_indexed' if chunks already exist for this scope/component.
    """
    scope = getattr(request, "scope", "chassis")
    engine_id = getattr(request, "engine_id", None)
    transmission_id = getattr(request, "transmission_id", None)

    # Build scope-aware already-indexed check
    base_filters = [
        func.lower(ManualChunk.vehicle_make) == request.make.lower(),
        func.lower(ManualChunk.vehicle_model) == request.model.lower(),
        ManualChunk.vehicle_year == request.year,
        ManualChunk.scope == scope,
    ]
    if scope == "engine" and engine_id:
        base_filters.append(ManualChunk.engine_id == engine_id)
    elif scope == "transmission" and transmission_id:
        base_filters.append(ManualChunk.transmission_id == transmission_id)

    count_result = await db.execute(
        select(func.count(ManualChunk.id)).where(and_(*base_filters))
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
        None, None, None,
        scope,
        engine_id,
        transmission_id,
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


@router.post("/upload", response_model=ManualUploadResponse)
async def upload_manual(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    file: UploadFile = File(...),
    scope: str = Form(...),
    make: str = Form(...),
    model: str = Form(...),
    year: int = Form(...),
    vehicle_id: str = Form(None),
    engine_id: str = Form(None),
    transmission_id: str = Form(None),
):
    """Upload a PDF or ZIP spec sheet / manual fragment and ingest it.

    Accepts:
    - PDF: pages extracted via pypdf, stored as ManualChunk rows
    - ZIP: processed through the standard ManualIngestor pipeline
    - Images (.png/.jpg/.jpeg): vision-extracted and stored as a single chunk

    scope must be one of: chassis | engine | transmission
    """
    if scope not in ("chassis", "engine", "transmission"):
        raise HTTPException(status_code=400, detail="scope must be 'chassis', 'engine', or 'transmission'")

    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()

    # Read uploaded bytes to a temp file
    content = await file.read()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(content)
        tmp.flush()
        tmp_path = Path(tmp.name)
    finally:
        tmp.close()

    job_id = None

    if suffix == ".pdf":
        from app.services.pdf_ingestor import PDFIngestor

        async def _run_pdf(path: Path, _scope, _make, _model, _year, _vid, _eid, _tid, _db):
            try:
                ingestor = PDFIngestor()
                await ingestor.ingest_pdf(
                    path, _make, _model, _year, _scope, _vid, _eid, _tid, _db
                )
            finally:
                try:
                    path.unlink()
                except Exception:
                    pass

        background_tasks.add_task(
            _run_pdf, tmp_path, scope, make, model, year,
            vehicle_id, engine_id, transmission_id, db,
        )
        return ManualUploadResponse(
            job_id=None,
            status="processing",
            message=f"PDF '{filename}' accepted — chunks will appear shortly.",
        )

    elif suffix == ".zip":
        import uuid as _uuid

        job_id = str(_uuid.uuid4())
        from app.services.manual_ingestor import _jobs, IngestJob
        _jobs[job_id] = IngestJob(job_id=job_id)

        async def _run_zip(path: Path, _jid, _year, _make, _model, _vid, _db, _scope, _eid, _tid):
            try:
                from app.services.manual_extractor import ManualExtractor
                from app.config import get_settings as _get_settings
                _settings = _get_settings()
                extract_dir = Path(_settings.manuals_storage_path) / "extracted" / f"upload_{_jid}"
                extractor = ManualExtractor()
                manual_dir = extractor.extract_and_clean(path, extract_dir)
                await _ingestor.run_pipeline(
                    _jid, _year, _make, _model, _vid, _db,
                    manual_dir_override=str(manual_dir),
                    scope=_scope, engine_id=_eid, transmission_id=_tid,
                )
            finally:
                try:
                    path.unlink()
                except Exception:
                    pass

        background_tasks.add_task(
            _run_zip, tmp_path, job_id, year, make, model,
            vehicle_id, db, scope, engine_id, transmission_id,
        )
        return ManualUploadResponse(
            job_id=job_id,
            status="pending",
            message=f"ZIP '{filename}' accepted — poll /api/manuals/status/{job_id} for progress.",
        )

    else:
        # Unsupported type — clean up and return error
        try:
            tmp_path.unlink()
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Accepted: .pdf, .zip",
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
    # Try PostgreSQL FTS; fall back to ILIKE for SQLite (tests)
    try:
        stmt = (
            select(ManualChunk)
            .where(
                and_(
                    func.lower(ManualChunk.vehicle_make) == make.lower(),
                    func.lower(ManualChunk.vehicle_model) == model.lower(),
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
                    ManualChunk.vehicle_make.ilike(make),
                    ManualChunk.vehicle_model.ilike(model),
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
