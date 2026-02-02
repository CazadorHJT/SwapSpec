# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwapSpec is an AI-driven engine swap planning platform. The repo contains two components:
- **`backend/`** — Python FastAPI REST API (the server)
- **`unity/`** — C# Unity mobile app (the client)

## Commands

All backend commands run from the `backend/` directory with the venv activated:

```bash
# Activate venv
source backend/venv/bin/activate

# Dev server
uvicorn app.main:app --reload

# Tests
pytest tests/                                    # all tests
pytest tests/test_api.py -v                      # verbose
pytest tests/test_api.py::test_register_user -v  # single test

# Seed database
python seed_data.py

# Dependencies
pip install -r requirements.txt

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

Unity scripts have no build step outside the Unity Editor. They compile when opened in Unity 2022.3+.

## Architecture

### Backend (FastAPI + Async SQLAlchemy 2.0 + Supabase)

**Async-first**: All DB operations use `AsyncSession`. Models use `Mapped` type hints with `mapped_column()`. The `get_db` dependency yields async sessions.

**Supabase Auth**: Registration and login go through Supabase Auth (`sign_up`, `sign_in_with_password`). Token validation uses `supabase.auth.get_user(token)` in the `get_current_user` dependency (`app/utils/auth.py`). No local password hashing — User.id is the Supabase Auth UUID.

**Supabase Storage**: File uploads go to Supabase Storage buckets (`uploads`, `meshes`). Public URLs returned via `get_public_url()`. No local StaticFiles mount.

**Supabase PostgreSQL via pgBouncer**: The `DATABASE_URL` connects through Supabase's connection pooler (`aws-1-us-east-1.pooler.supabase.com:6543`). The SQLAlchemy engine uses `statement_cache_size=0` in `connect_args` because pgBouncer doesn't support prepared statements.

**Router organization**: Each domain has a router in `app/routers/`, prefixed `/api/`. New routers must be exported via `app/routers/__init__.py` and registered in `app/main.py`.

**Data model relationships**:
- Users own Builds and contribute Vehicles
- Builds reference one Vehicle + one Engine + optional Transmission, and have many ChatMessages
- Transmissions match Engines via bellhousing pattern strings
- ChatMessages store per-build advisor conversation history

**Services**:
| Service | Location | Purpose |
|---------|----------|---------|
| AdvisorService | `app/services/advisor.py` | Claude AI chat (`claude-sonnet-4-20250514`), auto-persists history. Falls back to mock when `ANTHROPIC_API_KEY` unset |
| PDFService | `app/services/pdf_service.py` | WeasyPrint + Jinja2 templates in `app/templates/`. Requires system libs (`brew install cairo pango gdk-pixbuf libffi`). Returns 503 if unavailable |
| StorageService | `app/services/storage.py` | Supabase Storage uploads (buckets: `uploads`, `meshes`). Lazily instantiated in routers |
| VINDecoderService | `app/services/vin_decoder.py` | NHTSA API VIN decoding |
| get_supabase_client | `app/services/supabase_client.py` | Singleton Supabase client (LRU cached) for auth + storage |

### Unity Client (C#)

All scripts under `unity/Assets/Scripts/SwapSpec/`:

- **`Models/ApiModels.cs`** — `[Serializable]` data classes matching every backend response schema
- **`Services/ApiClient.cs`** — `UnityWebRequest`-based HTTP client with auth token management, JSON via `JsonUtility`, coroutine-based async
- **`Services/*Service.cs`** — One service per backend domain (Auth, Vehicle, Engine, Transmission, Build, Advisor, File)
- **`UI/*Screen.cs`** — MonoBehaviour screen controllers with `[SerializeField]` UI references wired in Unity Editor
- **`UI/ScreenManager.cs`** — Shows/hides screen GameObjects for navigation

All services are MonoBehaviours intended to live on a persistent `SwapSpecManager` GameObject. `ApiClient` handles auth token attachment automatically.

### Testing

Tests use pytest-anyio for async support. The test fixture in `tests/conftest.py` overrides `DATABASE_URL` to use SQLite (`aiosqlite`) and mocks the Supabase client (auth + storage) via `unittest.mock.patch`. Login in tests sends JSON (not form data). See `tests/test_api.py` for the mock setup pattern.

## Environment Variables

In `backend/.env`:
- `DATABASE_URL` — Supabase PostgreSQL via pooler (`postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres`)
- `SECRET_KEY` — App-level signing key (not used for auth tokens)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `ANTHROPIC_API_KEY` — Optional; enables AI advisor (mock fallback without it)
