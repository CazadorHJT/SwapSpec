from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Callable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.ingest_job import IngestJob
from app.services.charm_downloader import CharmDownloader
from app.services.manual_extractor import ManualExtractor
from app.services.gap_analyzer import GapAnalyzer
from app.services.gap_filler import GapFiller
from app.services.rag_indexer import RAGIndexer

settings = get_settings()


class ManualIngestor:
    """Orchestrates the full manual ingestion pipeline.

    Job state is persisted in the ``ingest_jobs`` PostgreSQL table (via the
    IngestJob model) instead of an in-memory dict, making status polling
    correct across multiple Uvicorn workers.

    Background tasks receive a ``session_factory`` callable (``async_session_maker``)
    and open their own DB sessions — they do NOT reuse the request-scoped session,
    which FastAPI closes when the handler returns.

    Data flow:
        POST /ingest → create_job() → start_ingest() → BackgroundTask: run_pipeline()
            download (charm.li) → extract (ZIP) → analyze (gaps) → fill (AI)
                → index (RAGIndexer) → update job status
    """

    async def create_job(self, job_id: str, db: AsyncSession) -> IngestJob:
        """Create a new IngestJob row and commit it so background tasks can find it."""
        job = IngestJob(job_id=job_id)
        db.add(job)
        await db.commit()
        return job

    async def start_ingest(
        self,
        year: int,
        make: str,
        model: str,
        vehicle_id: Optional[str],
        db: AsyncSession,
    ) -> str:
        """Create a job record and return its job_id. Caller schedules run_pipeline."""
        job_id = str(uuid.uuid4())
        await self.create_job(job_id, db)
        return job_id

    async def start_local_ingest(
        self,
        manual_dir: str,
        make: str,
        model: str,
        year: int,
        vehicle_id: Optional[str],
        db: AsyncSession,
    ) -> str:
        """Create a job for a local-directory ingest and return its job_id."""
        job_id = str(uuid.uuid4())
        await self.create_job(job_id, db)
        return job_id

    async def run_pipeline(
        self,
        job_id: str,
        year: int,
        make: str,
        model: str,
        vehicle_id: Optional[str],
        session_factory: Callable[[], Any],
        manual_dir_override: Optional[str] = None,
        drive_type: Optional[str] = None,
        cylinders: Optional[int] = None,
        scope: str = "chassis",
        engine_id: Optional[str] = None,
        transmission_id: Optional[str] = None,
        vision_extract: bool = True,
        variant_hint: Optional[str] = None,
    ) -> None:
        """Full pipeline: download → extract → analyze → fill → index.

        Opens its own DB session via session_factory — safe to call from
        FastAPI BackgroundTasks after the request session has been closed.
        Updates the IngestJob row throughout for status polling.
        """
        async with session_factory() as db:
            job = await db.get(IngestJob, job_id)
            if not job:
                return

            job.status = "running"
            await db.commit()

            manual_dir: Optional[Path] = None

            try:
                base_path = Path(settings.manuals_storage_path)

                if manual_dir_override:
                    manual_dir = Path(manual_dir_override)
                    job.stage = "analyzing"
                    await db.commit()
                else:
                    # --- Stage: downloading ---
                    job.stage = "downloading"
                    await db.commit()
                    downloader = CharmDownloader()
                    zip_path = await downloader.find_and_download(
                        year, make, model, base_path / "zips",
                        drive_type=drive_type, cylinders=cylinders,
                        variant_hint=variant_hint,
                    )
                    if not zip_path:
                        job.status = "failed"
                        job.error = f"Could not find or download manual for {year} {make} {model} from charm.li"
                        await db.commit()
                        return

                    # --- Stage: extracting ---
                    job.stage = "extracting"
                    await db.commit()
                    extractor = ManualExtractor()
                    extract_dir = base_path / "extracted" / f"{make}_{year}_{model}"
                    manual_dir = extractor.extract_and_clean(zip_path, extract_dir)

                    job.stage = "analyzing"
                    await db.commit()

                # --- Stage: analyzing ---
                analyzer = GapAnalyzer()
                gap_report = analyzer.analyze(manual_dir, make, model, year)

                # --- Stage: filling ---
                job.stage = "filling"
                await db.commit()
                filler = GapFiller()
                filled = await filler.fill_gaps(manual_dir, gap_report, make, model, year)
                job.gaps_filled = len(filled)
                await db.commit()

                # --- Stage: indexing ---
                job.stage = "indexing"
                await db.commit()

                vision_extractor = None
                if vision_extract:
                    try:
                        from app.services.vision_extractor import VisionExtractor
                        vision_extractor = VisionExtractor()
                    except Exception:
                        pass

                indexer = RAGIndexer()
                count = await indexer.index_manual(
                    manual_dir, make, model, year, vehicle_id, db,
                    scope=scope,
                    engine_id=engine_id,
                    transmission_id=transmission_id,
                    vision_extractor=vision_extractor,
                    session_factory=session_factory,
                )
                job.chunks_indexed = count
                job.status = "complete"
                job.stage = "done"
                await db.commit()

            except Exception as exc:
                job.status = "failed"
                job.error = str(exc)
                await db.commit()

    async def get_status(self, job_id: str, db: AsyncSession) -> Optional[IngestJob]:
        """Look up job status from the database."""
        return await db.get(IngestJob, job_id)
