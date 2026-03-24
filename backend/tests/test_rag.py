"""
Tests for the agentic RAG pipeline.

Covers:
  - _parse_breadcrumb_path: semantic section_path extraction from charm.li HTML
  - _walk_htmls: symlink rejection, HTML-only filtering
  - _upsert_chunk: source priority precedence (SQLite fallback path)
  - _handle_image_page: vision / storage-upload / stub routing
  - _execute_fetch_diagram: SSRF guard (HTTPS, host, private-IP layers)
  - search_chunks: ILIKE fallback on SQLite + scope filter
  - run_pipeline: regression — no TypeError from vision= parameter mismatch
"""
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def sqlite_db():
    """Isolated in-memory SQLite session for unit tests."""
    from app.database import Base

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


def _make_indexer():
    from app.services.rag_indexer import RAGIndexer
    return RAGIndexer()


# ---------------------------------------------------------------------------
# _parse_breadcrumb_path
# ---------------------------------------------------------------------------

class TestParseBreadcrumbPath:
    def test_charm_li_html_returns_semantic_path(self, tmp_path):
        html = (
            "<html><body>"
            "<a class='breadcrumb-part'>Home</a>"
            "<a class='breadcrumb-part'>Toyota</a>"
            "<a class='breadcrumb-part'>1993</a>"
            "<a class='breadcrumb-part'>Supra</a>"
            "<a class='breadcrumb-part'>Engine</a>"
            "<a class='breadcrumb-part'>Fuel System</a>"
            "</body></html>"
        )
        f = tmp_path / "fuel_system.html"
        f.write_text(html)
        result = _make_indexer()._parse_breadcrumb_path(f)
        assert result == "Engine > Fuel System"

    def test_non_charm_html_returns_none(self, tmp_path):
        html = "<html><body><h1>No breadcrumbs here</h1></body></html>"
        f = tmp_path / "page.html"
        f.write_text(html)
        result = _make_indexer()._parse_breadcrumb_path(f)
        assert result is None

    def test_exactly_four_crumbs_returns_none(self, tmp_path):
        # Only nav parts — no content sections beyond them
        html = (
            "<html><body>"
            "<a class='breadcrumb-part'>Home</a>"
            "<a class='breadcrumb-part'>Toyota</a>"
            "<a class='breadcrumb-part'>1993</a>"
            "<a class='breadcrumb-part'>Supra</a>"
            "</body></html>"
        )
        f = tmp_path / "page.html"
        f.write_text(html)
        result = _make_indexer()._parse_breadcrumb_path(f)
        assert result is None

    def test_multiple_content_sections_joined(self, tmp_path):
        html = (
            "<html><body>"
            "<a class='breadcrumb-part'>Home</a>"
            "<a class='breadcrumb-part'>Chevrolet</a>"
            "<a class='breadcrumb-part'>1998</a>"
            "<a class='breadcrumb-part'>Camaro</a>"
            "<a class='breadcrumb-part'>Chassis</a>"
            "<a class='breadcrumb-part'>Brakes</a>"
            "<a class='breadcrumb-part'>Caliper</a>"
            "</body></html>"
        )
        f = tmp_path / "caliper.html"
        f.write_text(html)
        result = _make_indexer()._parse_breadcrumb_path(f)
        assert result == "Chassis > Brakes > Caliper"


# ---------------------------------------------------------------------------
# _walk_htmls
# ---------------------------------------------------------------------------

class TestWalkHtmls:
    def test_normal_html_files_yielded(self, tmp_path):
        (tmp_path / "a.html").write_text("<html/>")
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "b.html").write_text("<html/>")
        files = list(_make_indexer()._walk_htmls(tmp_path))
        stems = {f.stem for f in files}
        assert "a" in stems
        assert "b" in stems

    def test_symlink_outside_root_rejected(self, tmp_path):
        outside = tmp_path.parent / f"outside_{uuid.uuid4().hex}.html"
        outside.write_text("<html/>")
        link = tmp_path / "evil.html"
        link.symlink_to(outside)
        try:
            files = list(_make_indexer()._walk_htmls(tmp_path))
            names = [f.name for f in files]
            assert "evil.html" not in names
        finally:
            outside.unlink(missing_ok=True)

    def test_non_html_files_not_yielded(self, tmp_path):
        (tmp_path / "a.txt").write_text("not html")
        (tmp_path / "b.html").write_text("<html/>")
        files = list(_make_indexer()._walk_htmls(tmp_path))
        assert all(f.suffix == ".html" for f in files)
        assert len(files) == 1


# ---------------------------------------------------------------------------
# Source precedence — _upsert_chunk (SQLite fallback path)
# ---------------------------------------------------------------------------

class TestSourcePrecedence:
    def _chunk_data(self, section_path="Engine > Fuel", data_source="charm_li", content=None):
        return {
            "vehicle_make": "Toyota",
            "vehicle_model": "Supra",
            "vehicle_year": 1993,
            "vehicle_id": None,
            "section_path": section_path,
            "content": content or f"Content from {data_source}.",
            "data_source": data_source,
            "confidence": "high",
            "scope": "chassis",
            "engine_id": None,
            "transmission_id": None,
        }

    @pytest.mark.anyio
    async def test_insert_when_no_existing(self, sqlite_db):
        from app.models.manual_chunk import ManualChunk
        from sqlalchemy import select

        await _make_indexer()._upsert_chunk(
            self._chunk_data("Sec > Insert", "charm_li", "Original content."),
            sqlite_db,
        )
        await sqlite_db.commit()

        result = await sqlite_db.execute(select(ManualChunk))
        chunks = result.scalars().all()
        assert len(chunks) == 1
        assert chunks[0].content == "Original content."
        assert chunks[0].source_priority == 2  # charm_li = 2

    @pytest.mark.anyio
    async def test_overwrite_when_higher_priority(self, sqlite_db):
        from app.models.manual_chunk import ManualChunk
        from sqlalchemy import select

        indexer = _make_indexer()
        await indexer._upsert_chunk(
            self._chunk_data("Sec > Overwrite", "charm_li", "Low-priority content."),
            sqlite_db,
        )
        await sqlite_db.commit()

        await indexer._upsert_chunk(
            self._chunk_data("Sec > Overwrite", "user_uploaded", "User-uploaded version."),
            sqlite_db,
        )
        await sqlite_db.commit()

        result = await sqlite_db.execute(select(ManualChunk))
        chunks = result.scalars().all()
        assert len(chunks) == 1
        assert chunks[0].content == "User-uploaded version."
        assert chunks[0].source_priority == 5  # user_uploaded = 5

    @pytest.mark.anyio
    async def test_skip_when_lower_priority(self, sqlite_db):
        from app.models.manual_chunk import ManualChunk
        from sqlalchemy import select

        indexer = _make_indexer()
        await indexer._upsert_chunk(
            self._chunk_data("Sec > Skip", "user_uploaded", "High-priority content."),
            sqlite_db,
        )
        await sqlite_db.commit()

        await indexer._upsert_chunk(
            self._chunk_data("Sec > Skip", "gap_filled_ai", "AI-filled attempt."),
            sqlite_db,
        )
        await sqlite_db.commit()

        result = await sqlite_db.execute(select(ManualChunk))
        chunks = result.scalars().all()
        assert len(chunks) == 1
        assert chunks[0].content == "High-priority content."  # unchanged
        assert chunks[0].source_priority == 5  # unchanged

    @pytest.mark.anyio
    async def test_equal_priority_overwrites(self, sqlite_db):
        from app.models.manual_chunk import ManualChunk
        from sqlalchemy import select

        indexer = _make_indexer()
        await indexer._upsert_chunk(
            self._chunk_data("Sec > Equal", "charm_li", "First charm_li."),
            sqlite_db,
        )
        await sqlite_db.commit()

        await indexer._upsert_chunk(
            self._chunk_data("Sec > Equal", "charm_li", "Second charm_li."),
            sqlite_db,
        )
        await sqlite_db.commit()

        result = await sqlite_db.execute(select(ManualChunk))
        chunks = result.scalars().all()
        assert len(chunks) == 1
        assert chunks[0].content == "Second charm_li."  # >= replaces


# ---------------------------------------------------------------------------
# _handle_image_page
# ---------------------------------------------------------------------------

class TestHandleImagePage:
    def _base_kwargs(self, image_path):
        return dict(
            image_path=image_path,
            section_path="Wiring Diagrams > ECM",
            make="Toyota",
            model="Supra",
            year=1993,
            vehicle_id=None,
            scope="chassis",
            engine_id=None,
            transmission_id=None,
        )

    @pytest.mark.anyio
    async def test_vision_extractor_path(self, tmp_path):
        img = tmp_path / "ecm_wiring.png"
        img.write_bytes(b"\x89PNG\r\n" + b"fake")

        mock_ve = MagicMock()
        mock_ve.extract.return_value = "Pin 1 is +12V ignition feed."

        with patch("app.services.vision_extractor.is_vision_category", return_value=True):
            result = await _make_indexer()._handle_image_page(
                **self._base_kwargs(img),
                vision_extractor=mock_ve,
                storage_service=None,
            )

        assert result["data_source"] == "charm_li_vision"
        assert "Pin 1" in result["content"]

    @pytest.mark.anyio
    async def test_vision_skips_non_vision_category(self, tmp_path):
        """Even with a vision_extractor, non-vision categories fall through to storage."""
        img = tmp_path / "text_page.png"
        img.write_bytes(b"\x89PNG\r\n" + b"fake")

        mock_ve = MagicMock()
        mock_ss = MagicMock()
        mock_ss.upload_bytes = AsyncMock(return_value="https://fake.supabase.co/img.png")

        with patch("app.services.vision_extractor.is_vision_category", return_value=False):
            result = await _make_indexer()._handle_image_page(
                **self._base_kwargs(img),
                vision_extractor=mock_ve,
                storage_service=mock_ss,
            )

        mock_ve.extract.assert_not_called()
        assert result["data_source"] == "charm_li_image"

    @pytest.mark.anyio
    async def test_storage_upload_path(self, tmp_path):
        img = tmp_path / "diagram.png"
        img.write_bytes(b"\x89PNG\r\n" + b"x" * 100)

        mock_ss = MagicMock()
        mock_ss.upload_bytes = AsyncMock(
            return_value="https://fake.supabase.co/manuals/diagram.png"
        )

        with patch("app.services.vision_extractor.is_vision_category", return_value=False):
            result = await _make_indexer()._handle_image_page(
                **self._base_kwargs(img),
                vision_extractor=None,
                storage_service=mock_ss,
            )

        assert result["data_source"] == "charm_li_image"
        assert result["source_url"] == "https://fake.supabase.co/manuals/diagram.png"

    @pytest.mark.anyio
    async def test_stub_fallback_path(self, tmp_path):
        img = tmp_path / "stub.png"
        img.write_bytes(b"\x89PNG\r\n" + b"fake")

        with patch("app.services.vision_extractor.is_vision_category", return_value=False):
            result = await _make_indexer()._handle_image_page(
                **self._base_kwargs(img),
                vision_extractor=None,
                storage_service=None,
            )

        assert result["data_source"] == "charm_li_stub"
        assert result["source_url"] is None


# ---------------------------------------------------------------------------
# SSRF guard — _execute_fetch_diagram
# ---------------------------------------------------------------------------

class TestSsrfGuard:
    def _advisor(self):
        from app.services.advisor import AdvisorService
        svc = AdvisorService.__new__(AdvisorService)
        svc.client = None
        svc._provider = None
        return svc

    @pytest.mark.anyio
    async def test_http_url_rejected(self):
        result = await self._advisor()._execute_fetch_diagram(
            "http://fake.supabase.co/storage/v1/object/public/manuals/img.png",
            "describe this",
        )
        assert "HTTPS" in result or "rejected" in result.lower()

    @pytest.mark.anyio
    async def test_non_supabase_host_rejected(self):
        result = await self._advisor()._execute_fetch_diagram(
            "https://evil.com/storage/v1/object/public/manuals/img.png",
            "describe this",
        )
        assert "rejected" in result.lower()

    @pytest.mark.anyio
    async def test_private_ip_rejected(self):
        with patch("socket.gethostbyname", return_value="192.168.1.1"):
            result = await self._advisor()._execute_fetch_diagram(
                "https://fake.supabase.co/storage/v1/object/public/manuals/img.png",
                "describe this",
            )
        assert "rejected" in result.lower()

    @pytest.mark.anyio
    async def test_loopback_ip_rejected(self):
        with patch("socket.gethostbyname", return_value="127.0.0.1"):
            result = await self._advisor()._execute_fetch_diagram(
                "https://fake.supabase.co/storage/v1/object/public/manuals/img.png",
                "describe this",
            )
        assert "rejected" in result.lower()

    @pytest.mark.anyio
    async def test_link_local_ip_rejected(self):
        with patch("socket.gethostbyname", return_value="169.254.0.1"):
            result = await self._advisor()._execute_fetch_diagram(
                "https://fake.supabase.co/storage/v1/object/public/manuals/img.png",
                "describe this",
            )
        assert "rejected" in result.lower()

    @pytest.mark.anyio
    async def test_unresolvable_host_rejected(self):
        import socket
        with patch("socket.gethostbyname", side_effect=socket.gaierror("NXDOMAIN")):
            result = await self._advisor()._execute_fetch_diagram(
                "https://fake.supabase.co/storage/v1/object/public/manuals/img.png",
                "describe this",
            )
        assert "rejected" in result.lower() or "resolve" in result.lower()


# ---------------------------------------------------------------------------
# search_chunks — ILIKE fallback on SQLite
# ---------------------------------------------------------------------------

class TestSearchChunks:
    @pytest.mark.anyio
    async def test_returns_matching_chunks(self, sqlite_db):
        from app.models.manual_chunk import ManualChunk
        from app.services.manual_search import search_chunks

        chunk = ManualChunk(
            id=str(uuid.uuid4()),
            vehicle_make="Toyota",
            vehicle_model="Supra",
            vehicle_year=1993,
            section_path="Engine > Timing",
            content="Timing belt tension spec is 4.0 kg.",
            data_source="charm_li",
            confidence="high",
            scope="chassis",
            source_priority=2,
        )
        sqlite_db.add(chunk)
        await sqlite_db.commit()

        results = await search_chunks(sqlite_db, "timing belt tension", None, limit=5)
        assert len(results) >= 1
        assert any("timing belt" in r.content.lower() for r in results)

    @pytest.mark.anyio
    async def test_scope_filter_excludes_other_scopes(self, sqlite_db):
        from app.models.manual_chunk import ManualChunk
        from app.services.manual_search import search_chunks
        from sqlalchemy import and_

        chassis_chunk = ManualChunk(
            id=str(uuid.uuid4()),
            vehicle_make="Toyota",
            vehicle_model="Supra",
            vehicle_year=1993,
            section_path="Chassis > Brakes",
            content="Brake torque spec for chassis.",
            data_source="charm_li",
            confidence="high",
            scope="chassis",
            source_priority=2,
        )
        engine_chunk = ManualChunk(
            id=str(uuid.uuid4()),
            vehicle_make="Toyota",
            vehicle_model="Supra",
            vehicle_year=1993,
            section_path="Engine > Ignition",
            content="Brake torque spec for engine.",
            data_source="charm_li",
            confidence="high",
            scope="engine",
            source_priority=2,
        )
        sqlite_db.add_all([chassis_chunk, engine_chunk])
        await sqlite_db.commit()

        chassis_filter = and_(ManualChunk.scope == "chassis")
        results = await search_chunks(sqlite_db, "brake torque", chassis_filter, limit=5)
        assert len(results) >= 1
        assert all(r.scope == "chassis" for r in results)

    @pytest.mark.anyio
    async def test_no_match_returns_empty(self, sqlite_db):
        from app.services.manual_search import search_chunks

        results = await search_chunks(
            sqlite_db, "zzz_this_matches_nothing_zzz", None, limit=5
        )
        assert results == []


# ---------------------------------------------------------------------------
# run_pipeline regression — no TypeError from vision= kwarg
# ---------------------------------------------------------------------------

class TestRunPipelineRegression:
    @pytest.mark.anyio
    async def test_no_type_error_on_local_ingest(self):
        """Regression: run_pipeline must not raise TypeError from vision= mismatch."""
        from app.database import Base
        from app.models.ingest_job import IngestJob
        from app.services.manual_ingestor import ManualIngestor

        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        job_id = str(uuid.uuid4())
        async with Session() as s:
            s.add(IngestJob(job_id=job_id))
            await s.commit()

        with (
            patch("app.services.manual_ingestor.GapAnalyzer") as mock_ga,
            patch("app.services.manual_ingestor.GapFiller") as mock_gf,
            patch("app.services.manual_ingestor.RAGIndexer") as mock_ri,
        ):
            mock_ga.return_value.analyze.return_value = MagicMock(
                missing=[], present=[], broken=[]
            )
            mock_gf.return_value.fill_gaps = AsyncMock(return_value=[])
            mock_ri.return_value.index_manual = AsyncMock(return_value=0)

            ingestor = ManualIngestor()
            try:
                await ingestor.run_pipeline(
                    job_id,
                    1993,
                    "Toyota",
                    "Supra",
                    None,
                    Session,
                    manual_dir_override="/nonexistent_path_xyz",
                    scope="chassis",
                )
            except TypeError as exc:
                pytest.fail(f"run_pipeline raised TypeError: {exc}")
            except Exception:
                # Other errors (e.g. directory not found) are OK — we only guard TypeError
                pass

        await engine.dispose()
