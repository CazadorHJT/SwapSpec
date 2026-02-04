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

### Data Provenance

Engine, Vehicle, and Transmission models each have two tracking fields:
- `data_sources` (JSON) — maps field name to source type: `"manufacturer"`, `"carquery_api"`, `"nhtsa_api"`, or `"user_contributed"`
- `data_source_notes` (Text) — free-text citations

When creating entities via API, user-provided spec fields are automatically tagged as `"user_contributed"`. Background auto-enrichment then fills null fields from CarQuery/NHTSA APIs with appropriate source tags. Existing non-null values are never overwritten by API data.

### Services

| Service | Location | Purpose |
|---------|----------|---------|
| `AdvisorService` | `app/services/advisor.py` | Claude AI chat with data integrity rules. Auto-persists history. Falls back to mock when `ANTHROPIC_API_KEY` unset |
| `CarQueryClient` | `app/services/carquery_client.py` | Free CarQuery API client for displacement, compression ratio, bore/stroke, HP, torque, weight |
| `SpecLookupService` | `app/services/spec_lookup.py` | Orchestrates CarQuery + NHTSA lookups, merges results, enriches entities |
| `PDFService` | `app/services/pdf_service.py` | WeasyPrint + Jinja2 templates. Requires system libs (`brew install cairo pango gdk-pixbuf libffi`). Returns 503 if unavailable |
| `StorageService` | `app/services/storage.py` | Supabase Storage uploads (buckets: `uploads`, `meshes`) |
| `VINDecoderService` | `app/services/vin_decoder.py` | NHTSA vPIC API for VIN decoding |
| `get_supabase_client` | `app/services/supabase_client.py` | Singleton Supabase client for auth + storage (LRU cached) |

### Spec Lookup System

The spec lookup system (`/api/specs/lookup/engine`, `/api/specs/lookup/vehicle`) queries external APIs without saving to the database. Useful for pre-filling forms.

Auto-enrichment happens on entity creation: after a POST to `/api/engines` or `/api/vehicles`, the `SpecLookupService` fills null fields from APIs in the background. Merge priority: NHTSA > CarQuery > existing data.

The advisor system prompt includes data integrity rules that prevent fabricating specs. Each spec shown to the advisor is tagged with its source (`[MANUFACTURER]`, `[API]`, `[USER]`), and missing data is labeled `DATA NOT AVAILABLE`.

### Testing

Tests use pytest-anyio with async support. `tests/conftest.py` overrides `DATABASE_URL` to SQLite for isolation and clears the settings LRU cache. All Supabase interactions (auth, storage) are mocked via `unittest.mock.patch` on `get_supabase_client` across four modules (`supabase_client`, `auth`, `routers.auth`, `storage`). Login endpoint accepts JSON body (not OAuth2 form data).

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — Supabase PostgreSQL via pooler (`postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres`)
- `SECRET_KEY` — App-level signing key (not used for auth tokens)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `ANTHROPIC_API_KEY` — Optional, enables AI advisor (falls back to mock)

## Supabase Setup

1. Create storage buckets `uploads` and `meshes` in Supabase Dashboard (set to public if you want public URLs)
2. Tables are created via `Base.metadata.create_all` on startup (`init_db` in lifespan) or via Alembic migrations
3. Auth is handled entirely by Supabase — no local password storage
4. Connection uses pgBouncer pooler (port 6543) — prepared statements are disabled
