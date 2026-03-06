"""PDF ingestor: extracts text from uploaded PDF files and upserts as ManualChunk rows."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class PDFIngestor:
    def extract_text(self, pdf_path: Path) -> list[dict]:
        """
        Extract text from a PDF file page by page.

        Returns a list of page dicts:
            [{"page": 1, "content": "...", "section_path": "Page 1"}, ...]

        Falls back to an empty list on parse failure.
        """
        try:
            from pypdf import PdfReader
        except ImportError:
            logger.error("pypdf not installed — PDF ingestion unavailable. Run: pip install pypdf>=4.0.0")
            return []

        pages: list[dict] = []
        try:
            reader = PdfReader(str(pdf_path))
            for i, page in enumerate(reader.pages, start=1):
                try:
                    text = page.extract_text() or ""
                    # Strip null bytes — PostgreSQL UTF-8 rejects \x00
                    text = text.replace("\x00", "").strip()
                    if text:
                        pages.append({
                            "page": i,
                            "content": text,
                            "section_path": f"Page {i}",
                        })
                except Exception as exc:
                    logger.debug("Failed to extract page %d from %s: %s", i, pdf_path, exc)
        except Exception as exc:
            logger.warning("Failed to parse PDF %s: %s", pdf_path, exc)

        return pages

    async def ingest_pdf(
        self,
        pdf_path: Path,
        make: str,
        model: str,
        year: int,
        scope: str,
        vehicle_id: Optional[str],
        engine_id: Optional[str],
        transmission_id: Optional[str],
        db: AsyncSession,
    ) -> int:
        """
        Extract pages from a PDF and upsert them as ManualChunk rows.

        Returns the number of chunks written.
        """
        from app.services.rag_indexer import RAGIndexer

        pages = self.extract_text(pdf_path)
        if not pages:
            return 0

        indexer = RAGIndexer()
        count = 0
        for page in pages:
            await indexer._upsert_chunk(
                {
                    "vehicle_make": make,
                    "vehicle_model": model,
                    "vehicle_year": year,
                    "vehicle_id": vehicle_id,
                    "section_path": f"Uploaded PDF > {page['section_path']}",
                    "content": page["content"],
                    "data_source": "user_uploaded",
                    "confidence": "medium",
                    "scope": scope,
                    "engine_id": engine_id,
                    "transmission_id": transmission_id,
                },
                db,
            )
            count += 1

        await db.commit()
        return count
