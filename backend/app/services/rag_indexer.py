from __future__ import annotations

import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterator, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.manual_chunk import ManualChunk


class _TextExtractor(HTMLParser):
    """Minimal HTML tag stripper using stdlib html.parser."""

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._skip_tags = {"script", "style", "head"}
        self._in_skip = 0

    def handle_starttag(self, tag: str, attrs):
        if tag.lower() in self._skip_tags:
            self._in_skip += 1

    def handle_endtag(self, tag: str):
        if tag.lower() in self._skip_tags and self._in_skip > 0:
            self._in_skip -= 1

    def handle_data(self, data: str):
        if not self._in_skip:
            self._parts.append(data)

    def get_text(self) -> str:
        raw = " ".join(self._parts)
        # Collapse whitespace
        return re.sub(r"\s+", " ", raw).strip()


class RAGIndexer:
    async def index_manual(
        self,
        manual_dir: Path,
        make: str,
        model: str,
        year: int,
        vehicle_id: Optional[str],
        db: AsyncSession,
    ) -> int:
        """Walk HTML files, extract text, upsert chunks. Returns count of chunks written."""
        count = 0
        for html_path in self._walk_htmls(manual_dir):
            text = self._extract_text(html_path)
            if len(text) < 20:
                continue

            section_path = self._path_to_section(html_path, manual_dir)
            await self._upsert_chunk(
                {
                    "vehicle_make": make,
                    "vehicle_model": model,
                    "vehicle_year": year,
                    "vehicle_id": vehicle_id,
                    "section_path": section_path,
                    "content": text,
                    "data_source": "charm_li",
                    "confidence": "high",
                },
                db,
            )
            count += 1

        await db.commit()
        return count

    def _walk_htmls(self, manual_dir: Path) -> Iterator[Path]:
        """Yield all .html files under manual_dir, sorted for deterministic order."""
        yield from sorted(manual_dir.rglob("*.html"))

    def _extract_text(self, html_path: Path) -> str:
        """Strip HTML tags and return clean plain text."""
        try:
            raw = html_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return ""
        extractor = _TextExtractor()
        try:
            extractor.feed(raw)
        except Exception:
            return ""
        text = extractor.get_text()
        # Strip null bytes — PostgreSQL UTF-8 rejects \x00
        return text.replace('\x00', '')

    def _path_to_section(self, html_path: Path, root: Path) -> str:
        """Convert a file's path relative to the manual root into 'A > B > C' format."""
        try:
            rel = html_path.relative_to(root)
        except ValueError:
            return str(html_path.stem)

        parts = list(rel.parts)
        # Drop the filename (index.html / page.html) — the parent dirs are the section
        if len(parts) > 1:
            parts = parts[:-1]
        return " > ".join(parts)

    async def _upsert_chunk(self, chunk_data: dict, db: AsyncSession) -> None:
        """Insert or update a ManualChunk, keyed on (make, model, year, section_path)."""
        result = await db.execute(
            select(ManualChunk).where(
                and_(
                    ManualChunk.vehicle_make == chunk_data["vehicle_make"],
                    ManualChunk.vehicle_model == chunk_data["vehicle_model"],
                    ManualChunk.vehicle_year == chunk_data["vehicle_year"],
                    ManualChunk.section_path == chunk_data["section_path"],
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.content = chunk_data["content"]
            existing.data_source = chunk_data["data_source"]
            existing.confidence = chunk_data["confidence"]
            if chunk_data.get("vehicle_id"):
                existing.vehicle_id = chunk_data["vehicle_id"]
            db.add(existing)
        else:
            chunk = ManualChunk(**chunk_data)
            db.add(chunk)
