from __future__ import annotations

import re
import uuid
from html.parser import HTMLParser
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Iterator, Optional

from sqlalchemy import select, and_, delete as sa_delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.manual_chunk import ManualChunk

if TYPE_CHECKING:
    from app.services.storage import StorageService
    from app.services.vision_extractor import VisionExtractor

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

# Source precedence: higher rank wins; never overwrite with lower-quality content.
SOURCE_RANK: dict[str, int] = {
    "user_uploaded": 5,
    "charm_li_vision": 4,
    "charm_li_image": 3,
    "charm_li": 2,
    "charm_li_stub": 2,
    "gap_filled_ai": 1,
}

# Refresh the DB connection after this many chunks when a session_factory is provided.
# Prevents pgBouncer from killing long-running indexing connections.
_SESSION_REFRESH_EVERY = 500


# ---------------------------------------------------------------------------
# HTML parsers
# ---------------------------------------------------------------------------

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


class _BreadcrumbExtractor(HTMLParser):
    """Extract text from <a class='breadcrumb-part'> elements in charm.li pages."""

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._in_crumb = False

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a" and "breadcrumb-part" in dict(attrs).get("class", ""):
            self._in_crumb = True

    def handle_endtag(self, tag):
        if tag.lower() == "a":
            self._in_crumb = False

    def handle_data(self, data):
        if self._in_crumb and data.strip():
            self._parts.append(data.strip())

    def get_parts(self) -> list[str]:
        return self._parts


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def _has_img_tag(html_path: Path) -> Optional[str]:
    """Return the src of the first <img> tag in the file, or None."""
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


# ---------------------------------------------------------------------------
# RAGIndexer
# ---------------------------------------------------------------------------

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
        storage_service: Optional["StorageService"] = None,
        vision_extractor: Optional["VisionExtractor"] = None,
        session_factory: Optional[Callable[[], Any]] = None,
    ) -> int:
        """Walk HTML files, extract text, upsert chunks. Returns count of chunks written.

        Vision pipeline (per image-only page, len(text) < 20):
          1. If vision_extractor available and section is a diagram category:
             → VisionExtractor.extract() → store as charm_li_vision
          2. Else if storage_service available:
             → upload image to Supabase Storage → store as charm_li_image
          3. Else:
             → store as charm_li_stub (placeholder, no image URL)

        When session_factory is provided, a fresh DB connection is opened every
        _SESSION_REFRESH_EVERY chunks to avoid pgBouncer idle-connection timeouts
        on long-running indexing jobs.

        Data flow:
            _walk_htmls() → _extract_text() / _parse_breadcrumb_path()
                → image detection → vision / storage upload
                    → _upsert_chunk() → commit every 50 chunks
        """
        from app.services.vision_extractor import is_vision_category

        count = 0
        current_db = db

        async def _maybe_refresh_session():
            nonlocal current_db
            if session_factory is None or count % _SESSION_REFRESH_EVERY != 0:
                return
            await current_db.commit()
            await current_db.close()
            current_db = session_factory()
            await current_db.__aenter__()

        for html_path in self._walk_htmls(manual_dir):
            text = self._extract_text(html_path)

            section_path = (
                self._parse_breadcrumb_path(html_path)
                or self._path_to_section(html_path, manual_dir)
            )

            # --- Image-only page detection (very little text, has an <img>) ---
            img_src = _has_img_tag(html_path) if len(text) < 20 else None

            if len(text) < 20 and img_src:
                image_path = _resolve_image_path(html_path, img_src)
                if image_path:
                    chunk_data = await self._handle_image_page(
                        image_path=image_path,
                        section_path=section_path,
                        make=make,
                        model=model,
                        year=year,
                        vehicle_id=vehicle_id,
                        scope=scope,
                        engine_id=engine_id,
                        transmission_id=transmission_id,
                        vision_extractor=vision_extractor,
                        storage_service=storage_service,
                    )
                    await self._upsert_chunk(chunk_data, current_db)
                    count += 1
                    if count % 50 == 0:
                        await current_db.commit()
                    await _maybe_refresh_session()
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
                current_db,
            )
            count += 1
            if count % 50 == 0:
                await current_db.commit()
            await _maybe_refresh_session()

        await current_db.commit()
        if session_factory is not None and current_db is not db:
            await current_db.close()
        return count

    async def _handle_image_page(
        self,
        image_path: Path,
        section_path: str,
        make: str,
        model: str,
        year: int,
        vehicle_id: Optional[str],
        scope: str,
        engine_id: Optional[str],
        transmission_id: Optional[str],
        vision_extractor: Optional["VisionExtractor"],
        storage_service: Optional["StorageService"],
    ) -> dict:
        """Build chunk_data for an image-only manual page.

        Priority:
          1. vision_extractor + is_vision_category → charm_li_vision
          2. storage_service upload              → charm_li_image
          3. fallback                            → charm_li_stub
        """
        from app.services.vision_extractor import is_vision_category

        base = {
            "vehicle_make": make,
            "vehicle_model": model,
            "vehicle_year": year,
            "vehicle_id": vehicle_id,
            "section_path": section_path,
            "scope": scope,
            "engine_id": engine_id,
            "transmission_id": transmission_id,
        }

        # --- Path 1: Vision extraction ---
        if vision_extractor is not None and is_vision_category(section_path):
            vehicle_str = f"{year} {make} {model}"
            extracted = vision_extractor.extract(image_path, section_path, vehicle_str)
            if extracted:
                return {
                    **base,
                    "content": extracted,
                    "data_source": "charm_li_vision",
                    "confidence": "high",
                    "source_url": None,
                }

        # --- Path 2: Upload image to Supabase Storage ---
        image_url = None
        if storage_service is not None:
            try:
                img_bytes = image_path.read_bytes()
                if len(img_bytes) <= 5 * 1024 * 1024:
                    storage_key = f"manuals/{make}/{year}/{model}/{image_path.name}"
                    image_url = await storage_service.upload_bytes(
                        storage_key, img_bytes, "image/png", bucket="manuals"
                    )
            except Exception:
                pass

        if image_url:
            return {
                **base,
                "content": f"[Diagram: {section_path}] — visual content only",
                "data_source": "charm_li_image",
                "confidence": "low",
                "source_url": image_url,
            }

        # --- Path 3: Stub ---
        return {
            **base,
            "content": f"[Diagram: {section_path}] — visual content only",
            "data_source": "charm_li_stub",
            "confidence": "low",
            "source_url": None,
        }

    def _walk_htmls(self, manual_dir: Path) -> Iterator[Path]:
        """Yield .html files under manual_dir, rejecting symlinks that escape the directory."""
        root = manual_dir.resolve()
        for html_path in sorted(manual_dir.rglob("*.html")):
            try:
                resolved = html_path.resolve()
                resolved.relative_to(root)  # raises ValueError if outside root
            except (ValueError, OSError):
                continue
            yield html_path

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
        text = "".join(c for c in text if ord(c) >= 32 or c in "\n\t")
        text = text.encode("utf-8", errors="ignore").decode("utf-8")
        return text

    def _parse_breadcrumb_path(self, html_path: Path) -> Optional[str]:
        """Return semantic 'A > B > C' from charm.li breadcrumb, or None if not found."""
        try:
            raw = html_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return None
        parser = _BreadcrumbExtractor()
        try:
            parser.feed(raw)
        except Exception:
            return None
        parts = parser.get_parts()
        # charm.li breadcrumb: [Home, Make, Year, Variant, ...content sections...]
        content_parts = parts[4:]
        return " > ".join(content_parts) if content_parts else None

    def _path_to_section(self, html_path: Path, root: Path) -> str:
        """Convert a file's path relative to the manual root into 'A > B > C' format.

        Fallback used when breadcrumb is not present (gap-filled sections, user uploads).
        """
        try:
            rel = html_path.relative_to(root)
        except ValueError:
            return str(html_path.stem)
        parts = list(rel.parts[:-1]) + [html_path.stem]
        return " > ".join(parts)

    async def _upsert_chunk(self, chunk_data: dict, db: AsyncSession) -> None:
        """Insert or update a ManualChunk using INSERT ... ON CONFLICT DO UPDATE.

        Source precedence (higher wins, never overwrite with lower):
            user_uploaded(5) > charm_li_vision(4) > charm_li_image(3)
            > charm_li/stub(2) > gap_filled_ai(1)

        Uses PostgreSQL's expression-index-aware ON CONFLICT clause. Falls back
        to SELECT+write for SQLite (test environments).
        """
        new_priority = SOURCE_RANK.get(chunk_data.get("data_source", ""), 0)

        # --- PostgreSQL path: atomic INSERT ... ON CONFLICT DO UPDATE ---
        try:
            await db.execute(
                text("""
                    INSERT INTO manual_chunks (
                        id, vehicle_make, vehicle_model, vehicle_year, vehicle_id,
                        section_path, content, data_source, confidence, source_url,
                        scope, engine_id, transmission_id, source_priority, created_at
                    ) VALUES (
                        :id, :vehicle_make, :vehicle_model, :vehicle_year, :vehicle_id,
                        :section_path, :content, :data_source, :confidence, :source_url,
                        :scope, :engine_id, :transmission_id, :source_priority, NOW()
                    )
                    ON CONFLICT (
                        vehicle_make, vehicle_model, vehicle_year, section_path, scope,
                        COALESCE(engine_id, ''), COALESCE(transmission_id, '')
                    ) DO UPDATE SET
                        content        = EXCLUDED.content,
                        data_source    = EXCLUDED.data_source,
                        confidence     = EXCLUDED.confidence,
                        source_url     = COALESCE(EXCLUDED.source_url, manual_chunks.source_url),
                        vehicle_id     = COALESCE(EXCLUDED.vehicle_id, manual_chunks.vehicle_id),
                        source_priority = EXCLUDED.source_priority
                    WHERE EXCLUDED.source_priority >= manual_chunks.source_priority
                """),
                {
                    "id": str(uuid.uuid4()),
                    "vehicle_make": chunk_data["vehicle_make"],
                    "vehicle_model": chunk_data["vehicle_model"],
                    "vehicle_year": chunk_data["vehicle_year"],
                    "vehicle_id": chunk_data.get("vehicle_id"),
                    "section_path": chunk_data["section_path"],
                    "content": chunk_data["content"],
                    "data_source": chunk_data["data_source"],
                    "confidence": chunk_data.get("confidence", "high"),
                    "source_url": chunk_data.get("source_url"),
                    "scope": chunk_data.get("scope", "chassis"),
                    "engine_id": chunk_data.get("engine_id"),
                    "transmission_id": chunk_data.get("transmission_id"),
                    "source_priority": new_priority,
                },
            )
            return
        except Exception:
            pass

        # --- SQLite fallback (test environments) ---
        scope = chunk_data.get("scope", "chassis")
        engine_id = chunk_data.get("engine_id")
        transmission_id = chunk_data.get("transmission_id")

        filters = [
            ManualChunk.vehicle_make == chunk_data["vehicle_make"],
            ManualChunk.vehicle_model == chunk_data["vehicle_model"],
            ManualChunk.vehicle_year == chunk_data["vehicle_year"],
            ManualChunk.section_path == chunk_data["section_path"],
            ManualChunk.scope == scope,
            ManualChunk.engine_id.is_(None) if not engine_id else ManualChunk.engine_id == engine_id,
            ManualChunk.transmission_id.is_(None) if not transmission_id else ManualChunk.transmission_id == transmission_id,
        ]

        result = await db.execute(select(ManualChunk).where(and_(*filters)))
        existing = result.scalar_one_or_none()

        if existing:
            if new_priority < existing.source_priority:
                return
            existing.content = chunk_data["content"]
            existing.data_source = chunk_data["data_source"]
            existing.confidence = chunk_data.get("confidence", "high")
            existing.source_priority = new_priority
            if chunk_data.get("source_url") is not None:
                existing.source_url = chunk_data["source_url"]
            if chunk_data.get("vehicle_id"):
                existing.vehicle_id = chunk_data["vehicle_id"]
            db.add(existing)
        else:
            chunk = ManualChunk(
                id=str(uuid.uuid4()),
                source_priority=new_priority,
                **{k: v for k, v in chunk_data.items()},
            )
            db.add(chunk)

    async def clear_stale_chunks(
        self,
        make: str,
        model: str,
        year: int,
        db: AsyncSession,
        scope: str = "chassis",
        engine_id: Optional[str] = None,
        transmission_id: Optional[str] = None,
    ) -> int:
        """Delete old numeric-path chunks (e.g. 'pages > 340') AFTER a successful re-index.

        Safe pattern: new semantic chunks are written first via upsert (different keys),
        then old stale chunks with numeric section_paths are cleaned up.

        Note: the regex operator (~) is PostgreSQL-only. This is a no-op on SQLite (tests).
        """
        filters = [
            ManualChunk.vehicle_make == make,
            ManualChunk.vehicle_model == model,
            ManualChunk.vehicle_year == year,
            ManualChunk.scope == scope,
            ManualChunk.section_path.op("~")(r"> pages > \d+$"),
        ]
        if engine_id:
            filters.append(ManualChunk.engine_id == engine_id)
        else:
            filters.append(ManualChunk.engine_id.is_(None))
        if transmission_id:
            filters.append(ManualChunk.transmission_id == transmission_id)
        else:
            filters.append(ManualChunk.transmission_id.is_(None))

        try:
            result = await db.execute(sa_delete(ManualChunk).where(and_(*filters)))
            await db.commit()
            return result.rowcount
        except Exception:
            # PostgreSQL regex not supported on SQLite (test environments)
            return 0
