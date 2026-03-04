from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.services.charm_downloader import CharmDownloader
from app.services.manual_extractor import ManualExtractor
from app.services.gap_analyzer import GapAnalyzer
from app.services.gap_filler import GapFiller
from app.services.rag_indexer import RAGIndexer

settings = get_settings()

# In-memory job store (MVP — sufficient without a job queue)
_jobs: dict[str, "IngestJob"] = {}


@dataclass
class IngestJob:
    job_id: str
    status: str = "pending"       # "pending" | "running" | "complete" | "failed"
    stage: str = "queued"         # "downloading" | "extracting" | "analyzing" | "filling" | "indexing"
    chunks_indexed: int = 0
    gaps_filled: int = 0
    error: Optional[str] = None


class ManualIngestor:
    async def start_ingest(
        self,
        year: int,
        make: str,
        model: str,
        vehicle_id: Optional[str],
        db: AsyncSession,
    ) -> str:
        """Queue a full download + process pipeline. Returns job_id."""
        job_id = str(uuid.uuid4())
        _jobs[job_id] = IngestJob(job_id=job_id)
        # Caller must schedule _run_pipeline via BackgroundTasks
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
        """Queue a pipeline starting from extraction (ZIP already present or dir already extracted).
        Returns job_id.
        """
        job_id = str(uuid.uuid4())
        _jobs[job_id] = IngestJob(job_id=job_id)
        return job_id

    async def run_pipeline(
        self,
        job_id: str,
        year: int,
        make: str,
        model: str,
        vehicle_id: Optional[str],
        db: AsyncSession,
        manual_dir_override: Optional[str] = None,
        drive_type: Optional[str] = None,
        cylinders: Optional[int] = None,
    ) -> None:
        """Full pipeline: download → extract → analyze → fill → index.

        Called via FastAPI BackgroundTasks. Updates _jobs[job_id] throughout.
        """
        job = _jobs.get(job_id)
        if not job:
            return

        job.status = "running"
        manual_dir: Optional[Path] = None

        try:
            base_path = Path(settings.manuals_storage_path)

            if manual_dir_override:
                # Local ingest — skip download/extract, use provided directory
                manual_dir = Path(manual_dir_override)
                job.stage = "analyzing"
            else:
                # --- Stage: downloading ---
                job.stage = "downloading"
                downloader = CharmDownloader()
                zip_path = await downloader.find_and_download(
                    year, make, model, base_path / "zips",
                    drive_type=drive_type, cylinders=cylinders,
                )
                if not zip_path:
                    job.status = "failed"
                    job.error = f"Could not find or download manual for {year} {make} {model} from charm.li"
                    return

                # --- Stage: extracting ---
                job.stage = "extracting"
                extractor = ManualExtractor()
                extract_dir = base_path / "extracted" / f"{make}_{year}_{model}"
                manual_dir = extractor.extract_and_clean(zip_path, extract_dir)

                job.stage = "analyzing"

            # --- Stage: analyzing ---
            analyzer = GapAnalyzer()
            gap_report = analyzer.analyze(manual_dir, make, model, year)

            # --- Stage: filling ---
            job.stage = "filling"
            filler = GapFiller()
            filled = await filler.fill_gaps(manual_dir, gap_report, make, model, year)
            job.gaps_filled = len(filled)

            # --- Stage: indexing ---
            job.stage = "indexing"
            indexer = RAGIndexer()
            count = await indexer.index_manual(manual_dir, make, model, year, vehicle_id, db)
            job.chunks_indexed = count

            job.status = "complete"
            job.stage = "done"

        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)

    def get_status(self, job_id: str) -> Optional[IngestJob]:
        return _jobs.get(job_id)
