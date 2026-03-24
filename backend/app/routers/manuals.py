import asyncio
import json
import tempfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_maker
from app.models.manual_chunk import ManualChunk
from app.models.ingest_job import IngestJob
from app.schemas.manual import (
    IngestStatusResponse,
    LocalManualIngestRequest,
    ManualChunkResponse,
    ManualIngestRequest,
    ManualSearchResponse,
    ManualUploadResponse,
)
from app.services.manual_ingestor import ManualIngestor
from app.services.manual_search import search_chunks
from app.utils.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/manuals", tags=["Manuals"])
_ingestor = ManualIngestor()

MAX_UPLOAD_BYTES = 150 * 1024 * 1024  # 150 MB


def _job_to_response(job: IngestJob) -> IngestStatusResponse:
    return IngestStatusResponse(
        job_id=job.job_id,
        status=job.status,
        stage=job.stage,
        chunks_indexed=job.chunks_indexed,
        gaps_filled=job.gaps_filled,
        error=job.error,
    )


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
    scope = request.scope
    engine_id = request.engine_id
    transmission_id = request.transmission_id

    # Scope-aware already-indexed check
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
        async_session_maker,   # background task opens its own sessions
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
        request.manual_dir, request.make, request.model, request.year,
        request.vehicle_id, db,
    )
    background_tasks.add_task(
        _ingestor.run_pipeline,
        job_id,
        request.year,
        request.make,
        request.model,
        request.vehicle_id,
        async_session_maker,
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
    """Upload a PDF, ZIP, or image spec sheet / manual fragment and ingest it.

    Accepted file types:
    - PDF  (.pdf)  — pages extracted via pypdf, stored as ManualChunk rows
    - ZIP  (.zip)  — processed through the standard ManualIngestor pipeline
    - Image (.png/.jpg/.jpeg) — vision-extracted via Claude Haiku and stored as a single chunk

    scope must be one of: chassis | engine | transmission
    """
    if scope not in ("chassis", "engine", "transmission"):
        raise HTTPException(status_code=400, detail="scope must be 'chassis', 'engine', or 'transmission'")

    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 150 MB)")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(content)
        tmp.flush()
        tmp_path = Path(tmp.name)
    finally:
        tmp.close()

    # --- PDF ---
    if suffix == ".pdf":
        async def _run_pdf(path: Path, _scope, _make, _model, _year, _vid, _eid, _tid):
            try:
                from app.services.pdf_ingestor import PDFIngestor
                async with async_session_maker() as session:
                    ingestor = PDFIngestor()
                    await ingestor.ingest_pdf(
                        path, _make, _model, _year, _scope, _vid, _eid, _tid, session
                    )
            finally:
                try:
                    path.unlink()
                except Exception:
                    pass

        background_tasks.add_task(
            _run_pdf, tmp_path, scope, make, model, year,
            vehicle_id, engine_id, transmission_id,
        )
        return ManualUploadResponse(
            job_id=None,
            status="processing",
            message=f"PDF '{filename}' accepted — chunks will appear shortly.",
        )

    # --- ZIP ---
    elif suffix == ".zip":
        import uuid as _uuid
        job_id = str(_uuid.uuid4())
        await _ingestor.create_job(job_id, db)

        async def _run_zip(path: Path, _jid, _year, _make, _model, _vid, _scope, _eid, _tid):
            try:
                from app.services.manual_extractor import ManualExtractor
                from app.config import get_settings as _get_settings
                _settings = _get_settings()
                extract_dir = Path(_settings.manuals_storage_path) / "extracted" / f"upload_{_jid}"
                extractor = ManualExtractor()
                manual_dir = extractor.extract_and_clean(path, extract_dir)
                await _ingestor.run_pipeline(
                    _jid, _year, _make, _model, _vid, async_session_maker,
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
            vehicle_id, scope, engine_id, transmission_id,
        )
        return ManualUploadResponse(
            job_id=job_id,
            status="pending",
            message=f"ZIP '{filename}' accepted — poll /api/manuals/status/{job_id} for progress.",
        )

    # --- Image ---
    elif suffix in (".png", ".jpg", ".jpeg"):
        async def _run_image(path: Path, _scope, _make, _model, _year, _vid, _eid, _tid):
            try:
                from app.services.vision_extractor import VisionExtractor
                import uuid as _uuid2
                vision = VisionExtractor()
                vehicle_str = f"{_year} {_make} {_model}"
                section_path = f"User Upload > {path.stem}"
                extracted = vision.extract(path, section_path, vehicle_str)
                if not extracted:
                    extracted = f"[Uploaded image: {path.name}] — no text could be extracted."
                async with async_session_maker() as session:
                    from app.models.manual_chunk import ManualChunk
                    from app.services.rag_indexer import SOURCE_RANK
                    chunk = ManualChunk(
                        id=str(_uuid2.uuid4()),
                        vehicle_make=_make,
                        vehicle_model=_model,
                        vehicle_year=_year,
                        vehicle_id=_vid,
                        section_path=section_path,
                        content=extracted,
                        data_source="user_uploaded",
                        confidence="high",
                        scope=_scope,
                        engine_id=_eid,
                        transmission_id=_tid,
                        source_priority=SOURCE_RANK["user_uploaded"],
                    )
                    session.add(chunk)
                    await session.commit()
            finally:
                try:
                    path.unlink()
                except Exception:
                    pass

        background_tasks.add_task(
            _run_image, tmp_path, scope, make, model, year,
            vehicle_id, engine_id, transmission_id,
        )
        return ManualUploadResponse(
            job_id=None,
            status="processing",
            message=f"Image '{filename}' accepted — vision extraction in progress.",
        )

    # --- Unsupported ---
    else:
        try:
            tmp_path.unlink()
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Accepted: .pdf, .zip, .png, .jpg, .jpeg",
        )


@router.post("/reindex", response_model=IngestStatusResponse)
async def reindex_manual(
    request: LocalManualIngestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    scope: str = "chassis",
    engine_id: str = None,
    transmission_id: str = None,
):
    """Re-index an already-extracted manual directory using the safe re-index pattern.

    Writes new semantic-path chunks first (via upsert), then deletes stale
    numeric-path chunks AFTER the index completes — no data loss window.
    """
    import uuid as _uuid
    job_id = str(_uuid.uuid4())
    await _ingestor.create_job(job_id, db)

    async def _run_reindex(_job_id, _manual_dir, _make, _model, _year, _vehicle_id,
                           _scope, _engine_id, _transmission_id):
        async with async_session_maker() as session:
            job = await session.get(IngestJob, _job_id)
            if not job:
                return
            job.status = "running"
            job.stage = "indexing"
            await session.commit()
            try:
                from app.services.rag_indexer import RAGIndexer
                manual_dir = Path(_manual_dir)
                if not manual_dir.exists():
                    job.status = "failed"
                    job.error = f"Directory not found: {_manual_dir}"
                    await session.commit()
                    return
                indexer = RAGIndexer()
                count = await indexer.index_manual(
                    manual_dir, _make, _model, _year, _vehicle_id, session,
                    scope=_scope, engine_id=_engine_id, transmission_id=_transmission_id,
                    session_factory=async_session_maker,
                )
                job.chunks_indexed = count
                job.stage = "cleanup"
                await session.commit()
                await indexer.clear_stale_chunks(
                    _make, _model, _year, session,
                    scope=_scope, engine_id=_engine_id, transmission_id=_transmission_id,
                )
                job.status = "complete"
                job.stage = "done"
                await session.commit()
            except Exception as exc:
                job.status = "failed"
                job.error = str(exc)
                await session.commit()

    background_tasks.add_task(
        _run_reindex, job_id, request.manual_dir, request.make, request.model,
        request.year, request.vehicle_id, scope, engine_id, transmission_id,
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
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Poll ingest job status."""
    job = await _ingestor.get_status(job_id, db)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_response(job)


@router.get("/status/{job_id}/stream")
async def stream_ingest_status(
    job_id: str,
    current_user=Depends(get_current_user),
):
    """Server-Sent Events stream for real-time ingest job status.

    Emits one JSON event per second with the current job state.
    Closes automatically when status is 'complete' or 'failed'.

    Usage (JavaScript):
        const es = new EventSource('/api/manuals/status/{job_id}/stream');
        es.onmessage = (e) => { const job = JSON.parse(e.data); ... };
    """
    async def _generate():
        while True:
            async with async_session_maker() as session:
                job = await session.get(IngestJob, job_id)
            if job is None:
                yield f"data: {json.dumps({'error': 'job not found'})}\n\n"
                break
            payload = {
                "job_id": job.job_id,
                "status": job.status,
                "stage": job.stage,
                "chunks_indexed": job.chunks_indexed,
                "gaps_filled": job.gaps_filled,
                "error": job.error,
            }
            yield f"data: {json.dumps(payload)}\n\n"
            if job.status in ("complete", "failed"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(_generate(), media_type="text/event-stream")


@router.get("/search", response_model=ManualSearchResponse)
async def search_manual_chunks(
    q: str,
    make: str,
    model: str,
    year: int,
    limit: int = 5,
    scope: str = None,
    engine_id: str = None,
    transmission_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Full-text search over indexed manual chunks.

    Optional scope filtering (scope, engine_id, transmission_id) matches how
    the advisor's search_manual tool works internally — use them to avoid
    mixing chassis and engine manual results for the same vehicle year/make/model.
    """
    from sqlalchemy import func as sqla_func

    base_filter = and_(
        sqla_func.lower(ManualChunk.vehicle_make) == make.lower(),
        sqla_func.lower(ManualChunk.vehicle_model) == model.lower(),
        ManualChunk.vehicle_year == year,
    )

    if scope:
        base_filter = and_(base_filter, ManualChunk.scope == scope)
    if engine_id:
        base_filter = and_(base_filter, ManualChunk.engine_id == engine_id)
    if transmission_id:
        base_filter = and_(base_filter, ManualChunk.transmission_id == transmission_id)

    chunks = await search_chunks(db, q, base_filter, limit=limit)

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
        select(func.count(ManualChunk.id)).where(ManualChunk.vehicle_id == vehicle_id)
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
