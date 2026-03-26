# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Activate venv first
source venv/bin/activate

# Run development server
uvicorn app.main:app --reload

# Run all tests
pytest tests/

# Run a single test file
pytest tests/test_api.py -v

# Run a specific test
pytest tests/test_api.py::test_register_user -v

# Initialize/reset database with seed data (idempotent — skips existing entries)
python seed_data.py

# Install dependencies
pip install -r requirements.txt

# Generate database migration (after model changes)
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Architecture

FastAPI backend for SwapSpec, an engine swap planning platform. Provides REST APIs for a Next.js web frontend and Unity mobile app.

### Core Patterns

**Async SQLAlchemy 2.0 + Supabase PostgreSQL**: All database operations are async via asyncpg through Supabase's pgBouncer pooler. The engine uses `connect_args={"statement_cache_size": 0}` because pgBouncer doesn't support prepared statements. The `get_db` dependency yields async sessions. Models use `Mapped` type hints with `mapped_column()`.

**Supabase Auth**: Registration and login go through Supabase Auth (`sign_up`, `sign_in_with_password`). Token validation uses `supabase.auth.get_user(token)`. No local password hashing — Supabase manages credentials. The `get_current_user` dependency in `app/utils/auth.py` validates Supabase JWTs. User.id is the Supabase Auth UUID.

**Supabase Storage**: File uploads go to Supabase Storage buckets (`uploads`, `meshes`). Public URLs returned via `get_public_url()`. `StorageService` is lazily instantiated in `app/routers/files.py` via `_get_storage()` to support test mocking.

**Router Organization**: Each domain has its own router in `app/routers/`, prefixed with `/api/` and registered in `app/main.py`. Export new routers via `app/routers/__init__.py`.

**Alembic**: `alembic/env.py` reads `DATABASE_URL` from `.env` at runtime (not hardcoded). When connecting to Supabase via pgBouncer, it sets `statement_cache_size=0` in `connect_args` automatically.

### Data Model

- **Users** own **Builds** and contribute **Vehicles** (User.id = Supabase Auth UUID)
- **Builds** reference one **Vehicle**, one **Engine**, optionally one **Transmission**, and have many **ChatMessages**
- **ChatMessages** store advisor conversation history per build
- **Transmissions** match **Engines** via bellhousing patterns
- **ManualChunk** rows store indexed text from charm.li service manuals, scoped by `scope` (`"chassis"` | `"engine"` | `"transmission"`), with optional FKs to `engine_id` / `transmission_id`
- **Engine** + **Transmission** have `origin_year/make/model` identifying the donor vehicle whose service manual contains their documentation

### Data Provenance

Engine, Vehicle, and Transmission models each have two tracking fields:

- `data_sources` (JSON) — maps field name to source type: `"manufacturer"`, `"carquery_api"`, `"nhtsa_api"`, or `"user_contributed"`
- `data_source_notes` (Text) — free-text citations

When creating entities via API, user-provided spec fields are automatically tagged as `"user_contributed"`. Background auto-enrichment then fills null fields from CarQuery/NHTSA APIs with appropriate source tags. Existing non-null values are never overwritten by API data.

### Services

| Service               | Location                           | Purpose                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdvisorService`      | `app/services/advisor.py`          | Anthropic path: agentic tool-use loop with `search_manual` + `fetch_diagram` tools. `_build_search_tool()` is async (runs COUNT queries per scope). Gemini path: pre-fetch FTS. Falls back to mock without API keys.    |
| `CarQueryClient`      | `app/services/carquery_client.py`  | Free CarQuery API client for displacement, compression ratio, bore/stroke, HP, torque, weight                                                                                                                           |
| `SpecLookupService`   | `app/services/spec_lookup.py`      | Orchestrates CarQuery + NHTSA lookups, merges results, enriches entities                                                                                                                                                |
| `PDFService`          | `app/services/pdf_service.py`      | WeasyPrint + Jinja2 templates. Requires system libs (`brew install cairo pango gdk-pixbuf libffi`). Returns 503 if unavailable                                                                                          |
| `StorageService`      | `app/services/storage.py`          | Supabase Storage uploads (buckets: `uploads`, `meshes`, `manuals`). Includes `upload_bytes()` async method for direct byte upload.                                                                                      |
| `VINDecoderService`   | `app/services/vin_decoder.py`      | NHTSA vPIC API for VIN decoding                                                                                                                                                                                         |
| `get_supabase_client` | `app/services/supabase_client.py`  | Singleton Supabase client for auth + storage (LRU cached). Patch at definition site only — lazy imports in auth.py and routers/auth.py mean patching those modules raises AttributeError.                               |
| `CharmDownloader`     | `app/services/charm_downloader.py` | Fetches charm.li year-index page, fuzzy-matches model with `difflib`, streams ZIP download                                                                                                                              |
| `ManualExtractor`     | `app/services/manual_extractor.py` | Unzips and URL-decodes all folder/file names. Validates ZIP members to block path traversal and symlink attacks.                                                                                                        |
| `GapAnalyzer`         | `app/services/gap_analyzer.py`     | Checks 10 critical spec paths; returns `GapReport(present, missing, broken)`                                                                                                                                            |
| `GapFiller`           | `app/services/gap_filler.py`       | Calls Claude to generate spec HTML for missing sections; skips when `ANTHROPIC_API_KEY` unset                                                                                                                           |
| `RAGIndexer`          | `app/services/rag_indexer.py`      | Walks HTML files, upserts `ManualChunk` rows. Source precedence via `source_priority` column; atomic `INSERT ... ON CONFLICT DO UPDATE WHERE priority >=`. Image pages: vision → storage → stub fallback chain.         |
| `ManualSearch`        | `app/services/manual_search.py`    | Shared FTS helper (PostgreSQL `to_tsvector` + `plainto_tsquery`; ILIKE fallback for SQLite). Used by advisor and manuals router.                                                                                        |
| `ManualIngestor`      | `app/services/manual_ingestor.py`  | Orchestrates full pipeline via `BackgroundTasks`. Job state in `IngestJob` PostgreSQL table. Takes `session_factory` callable — background tasks open their own DB sessions.                                            |
| `VisionExtractor`     | `app/services/vision_extractor.py` | Claude Haiku vision extraction for diagram AND spec-table pages (`VISION_CATEGORIES` list includes torque specs, valve clearance, service specifications, etc.). Skips >5 MB images. No-op without `ANTHROPIC_API_KEY`. |
| `PDFIngestor`         | `app/services/pdf_ingestor.py`     | `pypdf` page extraction → `ManualChunk` rows with `data_source="user_uploaded"`                                                                                                                                         |

### Engine + Transmission Wizard Endpoints

New endpoints for the build wizard's drill-down UX:

```bash
# Engine family grouping (for Step 1 family cards)
GET /api/engines/families?make=Toyota
# Returns [{family, make, variants: [{id, model, variant, power_hp, ...}]}]

# AI engine identification (for "Add Different Engine" dialog)
POST /api/engines/identify
{"query": "2jz turbo"}
# Returns {suggestions: [...], existing_match_id: "uuid" | null}

# Grouped transmissions for build wizard (for Step 2)
GET /api/transmissions/for-build?engine_id=...&vehicle_id=...
# Returns {stock_for_engine: [...], chassis_original_label: "...", chassis_original: [...], other_compatible: [...]}

# AI transmission identification (for "Add Different Transmission" dialog)
POST /api/transmissions/identify
{"query": "t56 magnum"}
# Returns {suggestions: [...], existing_match_id: "uuid" | null}
```

**"Stock for engine" logic**: queries transmissions sharing `origin_year/make/model` with the engine — no new DB field needed. The R154 (origin: 1993 Toyota Supra) matches the 2JZ-GTE (same origin), so it appears as stock.

**"Chassis original" logic**: looks up `vehicle.stock_transmission_model` string label. If a transmission in the DB matches, it's returned as selectable; otherwise just the label string is shown.

### Spec Lookup System

The spec lookup system (`/api/specs/lookup/engine`, `/api/specs/lookup/vehicle`) queries external APIs without saving to the database. Useful for pre-filling forms.

Auto-enrichment happens on entity creation: after a POST to `/api/engines` or `/api/vehicles`, the `SpecLookupService` fills null fields from APIs in the background. Merge priority: NHTSA > CarQuery > existing data.

The advisor system prompt includes data integrity rules that prevent fabricating specs. Each spec shown to the advisor is tagged with its source (`[MANUFACTURER]`, `[API]`, `[USER]`), and missing data is labeled `DATA NOT AVAILABLE`.

### Manual Ingestion Pipeline

Build creation triggers up to 3 background ingests automatically:

1. **Chassis** — target vehicle's service manual (`scope="chassis"`)
2. **Engine** — donor vehicle manual (`scope="engine"`, `engine_id=<id>`) — requires `engine.origin_year/make/model`
3. **Transmission** — donor vehicle manual (`scope="transmission"`, `transmission_id=<id>`) — requires `transmission.origin_year/make/model`

`seed_data.py` sets `origin_*` on all seeded engines and transmissions and backfills existing DB rows.

Manual content is only downloaded on first build creation. Pre-populate via `POST /api/manuals/ingest` if needed before any builds exist.

The `/api/manuals/upload` endpoint accepts PDF, ZIP, or image (PNG/JPG) files with a `scope` and component ID. PDFs → `PDFIngestor`; ZIPs → `ManualIngestor`; images → `VisionExtractor` → single chunk.

`rag_indexer.py` unique key: `(vehicle_make, vehicle_model, vehicle_year, section_path, scope, COALESCE(engine_id,''), COALESCE(transmission_id,''))` — so the same section can exist as both `scope="chassis"` and `scope="engine"` without collision.

**Session factory pattern**: Background tasks in `builds.py` and `manuals.py` receive `async_session_maker` (not a live session). The request-scoped session closes when the handler returns. `run_pipeline` signature: `session_factory: Callable[[], Any]` — it opens its own `async with session_factory() as db:`.

### Testing

**49 tests pass** (24 API + 25 RAG). Run: `pytest tests/`

`tests/conftest.py` overrides `DATABASE_URL` to SQLite, clears `get_settings` and `get_supabase_client` LRU caches. Mock only `app.services.supabase_client.get_supabase_client` — `auth.py` and `routers/auth.py` import it lazily inside functions, so patching those module namespaces raises `AttributeError`.

`tests/test_rag.py` covers RAG-specific codepaths: breadcrumb parsing, symlink rejection, source precedence upsert, image page routing, SSRF guard (all layers), FTS search, `run_pipeline` regression.

## Environment Variables

Required in `.env`:

- `DATABASE_URL` — Supabase PostgreSQL via pooler (`postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres`)
- `SECRET_KEY` — App-level signing key (not used for auth tokens)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `ANTHROPIC_API_KEY` — Optional; enables AI advisor, gap-filling, and vision extraction (mock fallback without it)
- `LOCAL_DEV` — Set `true` to bypass Supabase auth (uses `local_auth.py` with JWT + bcrypt)
- `MANUALS_STORAGE_PATH` — Directory for downloaded/extracted manuals (default `./manuals`)

## Supabase Setup

1. Create storage buckets `uploads`, `meshes`, and `manuals` in Supabase Dashboard (`manuals` should be public-read for diagram image URLs)
2. Tables are created via `Base.metadata.create_all` on startup (`init_db` in lifespan) or via Alembic migrations
3. Auth is handled entirely by Supabase — no local password storage
4. Connection uses pgBouncer pooler (port 6543) — prepared statements are disabled

## Alembic Migrations

Current migration chain:

- `8e125203e866` — Add expanded spec fields and data provenance (baseline)
- `a1b2c3d4e5f6` — Add manual scoping: `origin_year/make/model` on engines/transmissions; `scope/engine_id/transmission_id` on manual_chunks
- `c3d4e5f6a7b8` — GIN index on `manual_chunks.content` + unique expression index for upsert constraint
- `d4e5f6a7b8c9` — Add `ingest_jobs` table (PostgreSQL job persistence); add `source_priority` column on `manual_chunks` with backfill
- `e5f6a7b8c9d0` — Add `engine_family` + `origin_variant` to engines; `origin_variant` to transmissions; `stock_transmission_model` to vehicles; backfills seed data values
