from __future__ import annotations

import re
from html.parser import HTMLParser
from pathlib import Path
from typing import TYPE_CHECKING, Iterator, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.manual_chunk import ManualChunk

if TYPE_CHECKING:
    from app.services.vision_extractor import VisionExtractor


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


class _ImageSrcExtractor(HTMLParser):
    """Extracts the first <img src="..."> from an HTML file."""

    def __init__(self):
        super().__init__()
        self.src: Optional[str] = None

    def handle_starttag(self, tag: str, attrs):
        if tag.lower() == "img" and self.src is None:
            attrs_dict = dict(attrs)
            if "src" in attrs_dict:
                self.src = attrs_dict["src"]


def _has_img_tag(html_path: Path) -> Optional[str]:
    """Return the src of the first <img> tag in the file, or None if no img tag found."""
    try:
        raw = html_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
    parser = _ImageSrcExtractor()
    try:
        parser.feed(raw)
    except Exception:
        return None
    return parser.src


def _resolve_image_path(html_path: Path, img_src: str) -> Optional[Path]:
    """Resolve img_src relative to the HTML file's directory."""
    try:
        resolved = (html_path.parent / img_src).resolve()
        if resolved.exists():
            return resolved
    except Exception:
        pass
    return None


class RAGIndexer:
    async def index_manual(
        self,
        manual_dir: Path,
        make: str,
        model: str,
        year: int,
        vehicle_id: Optional[str],
        db: AsyncSession,
        scope: str = "chassis",
        engine_id: Optional[str] = None,
        transmission_id: Optional[str] = None,
        vision: Optional["VisionExtractor"] = None,
    ) -> int:
        """Walk HTML files, extract text, upsert chunks. Returns count of chunks written."""
        vehicle_str = f"{year} {make} {model}"
        count = 0

        for html_path in self._walk_htmls(manual_dir):
            text = self._extract_text(html_path)
            section_path = self._path_to_section(html_path, manual_dir)

            # Check for image-only pages (very little text but has an <img>)
            img_src = _has_img_tag(html_path) if len(text) < 20 else None

            if len(text) < 20 and img_src and vision is not None:
                # Try vision extraction for diagram pages
                image_path = _resolve_image_path(html_path, img_src)
                if image_path:
                    from app.services.vision_extractor import is_vision_category
                    if is_vision_category(section_path):
                        extracted = vision.extract(image_path, section_path, vehicle_str)
                        if extracted:
                            await self._upsert_chunk(
                                {
                                    "vehicle_make": make,
                                    "vehicle_model": model,
                                    "vehicle_year": year,
                                    "vehicle_id": vehicle_id,
                                    "section_path": section_path,
                                    "content": extracted,
                                    "data_source": "charm_li_vision",
                                    "confidence": "medium",
                                    "scope": scope,
                                    "engine_id": engine_id,
                                    "transmission_id": transmission_id,
                                },
                                db,
                            )
                            count += 1
                            continue

                    # No vision or not a vision category — write a stub
                    await self._upsert_chunk(
                        {
                            "vehicle_make": make,
                            "vehicle_model": model,
                            "vehicle_year": year,
                            "vehicle_id": vehicle_id,
                            "section_path": section_path,
                            "content": f"[Diagram: {section_path}] — visual content only",
                            "data_source": "charm_li_stub",
                            "confidence": "low",
                            "scope": scope,
                            "engine_id": engine_id,
                            "transmission_id": transmission_id,
                        },
                        db,
                    )
                    count += 1
                continue

            if len(text) < 20:
                continue

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
                    "scope": scope,
                    "engine_id": engine_id,
                    "transmission_id": transmission_id,
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
        """Insert or update a ManualChunk, keyed on (make, model, year, section_path, scope, engine_id, transmission_id)."""
        scope = chunk_data.get("scope", "chassis")
        engine_id = chunk_data.get("engine_id")
        transmission_id = chunk_data.get("transmission_id")

        filters = [
            ManualChunk.vehicle_make == chunk_data["vehicle_make"],
            ManualChunk.vehicle_model == chunk_data["vehicle_model"],
            ManualChunk.vehicle_year == chunk_data["vehicle_year"],
            ManualChunk.section_path == chunk_data["section_path"],
            ManualChunk.scope == scope,
        ]
        # Scope-specific component FK filters
        if engine_id:
            filters.append(ManualChunk.engine_id == engine_id)
        else:
            filters.append(ManualChunk.engine_id.is_(None))
        if transmission_id:
            filters.append(ManualChunk.transmission_id == transmission_id)
        else:
            filters.append(ManualChunk.transmission_id.is_(None))

        result = await db.execute(select(ManualChunk).where(and_(*filters)))
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
