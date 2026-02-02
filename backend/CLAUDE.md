# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run development server
uvicorn app.main:app --reload

# Run all tests
pytest tests/

# Run a single test file
pytest tests/test_api.py -v

# Run a specific test
pytest tests/test_api.py::test_register_user -v

# Initialize/reset database with seed data
python seed_data.py

# Install dependencies
pip install -r requirements.txt

# Generate database migration (after model changes)
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Architecture

FastAPI backend for SwapSpec, an engine swap planning platform. Provides REST APIs for a Unity mobile app.

### Core Patterns

**Async SQLAlchemy 2.0 + Supabase PostgreSQL**: All database operations are async via asyncpg through Supabase's pgBouncer pooler. The engine uses `connect_args={"statement_cache_size": 0}` because pgBouncer doesn't support prepared statements. The `get_db` dependency yields async sessions. Models use `Mapped` type hints with `mapped_column()`.

**Supabase Auth**: User registration and login go through Supabase Auth (`sign_up`, `sign_in_with_password`). Token validation uses `supabase.auth.get_user(token)`. No local password hashing — Supabase manages credentials. The `get_current_user` dependency in `app/utils/auth.py` validates Supabase JWTs. User.id is the Supabase Auth UUID.

**Supabase Storage**: File uploads go to Supabase Storage buckets (`uploads`, `meshes`). Public URLs are returned via `get_public_url()`. No local StaticFiles mount. `StorageService` is lazily instantiated in `app/routers/files.py` via `_get_storage()` to support test mocking.

**Router Organization**: Each domain has its own router in `app/routers/`, prefixed with `/api/` and registered in `app/main.py`. Export new routers via `app/routers/__init__.py`.

### Data Model

- **Users** own **Builds** and contribute **Vehicles** (User.id = Supabase Auth UUID)
- **Builds** reference one **Vehicle**, one **Engine**, optionally one **Transmission**, and have many **ChatMessages**
- **ChatMessages** store advisor conversation history per build
- **Transmissions** match **Engines** via bellhousing patterns

### Services

| Service | Purpose |
|---------|---------|
| `AdvisorService` | AI chat with Claude API, auto-persists conversation history |
| `PDFService` | Build report generation via WeasyPrint (requires system deps) |
| `StorageService` | File uploads to Supabase Storage buckets |
| `VINDecoderService` | NHTSA API integration for VIN decoding |
| `get_supabase_client` | Singleton Supabase client for auth + storage (LRU cached) |

### PDF Generation

WeasyPrint requires system libraries. Install on macOS:
```bash
brew install cairo pango gdk-pixbuf libffi
```
The app runs without these, but PDF endpoint returns 503 with installation instructions.

### Testing

Tests use pytest-anyio with async support. `tests/conftest.py` overrides `DATABASE_URL` to SQLite for isolation and clears the settings LRU cache. All Supabase interactions (auth, storage) are mocked via `unittest.mock.patch` on `get_supabase_client` across four modules (`supabase_client`, `auth`, `routers.auth`, `storage`). Login endpoint accepts JSON body (not OAuth2 form data).

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Supabase PostgreSQL via pooler (`postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres`)
- `SECRET_KEY` - App-level signing key (not used for auth tokens)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon/public key
- `ANTHROPIC_API_KEY` - Optional, enables AI advisor (falls back to mock)

## Supabase Setup

1. Create storage buckets `uploads` and `meshes` in Supabase Dashboard (set to public if you want public URLs)
2. Tables are created via `Base.metadata.create_all` on startup (`init_db` in lifespan) or via Alembic migrations
3. Auth is handled entirely by Supabase — no local password storage
4. Connection uses pgBouncer pooler (port 6543) — prepared statements are disabled
