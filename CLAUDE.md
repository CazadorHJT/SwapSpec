# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwapSpec is an AI-driven engine swap planning platform. The repo has three components:
- **`backend/`** — Python FastAPI REST API
- **`web/`** — Next.js 16 TypeScript frontend (App Router)
- **`unity/`** — C# Unity mobile app

The web frontend and Unity app are both clients of the backend. Neither talks to Supabase directly — all auth, storage, and data go through the FastAPI backend.

## Commands

### Backend

All commands run from `backend/` with the venv activated:

```bash
source backend/venv/bin/activate

# Dev server (port 8000)
uvicorn app.main:app --reload

# Tests
pytest tests/                                    # all tests
pytest tests/test_api.py -v                      # verbose
pytest tests/test_api.py::test_register_user -v  # single test

# Seed database with sample vehicles, engines, transmissions (idempotent)
python seed_data.py

# Dependencies
pip install -r requirements.txt

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Web Frontend

All commands run from `web/`:

```bash
npm install        # install dependencies
npm run dev        # dev server (port 3000)
npm run build      # production build (also runs TypeScript check)
npm run lint       # ESLint
```

### Unity

No build step outside the Unity Editor. Scripts compile when opened in Unity 2022.3+.

## Architecture

### How the Components Connect

```
Browser (web/) ──→ FastAPI (backend/) ──→ Supabase (Auth, PostgreSQL, Storage)
Unity (unity/) ──→ FastAPI (backend/) ──↗       ↑
                                                 ├── CarQuery API (engine/vehicle specs)
                                                 └── NHTSA vPIC API (VIN decoding, vehicle data)
```

The backend is the single gateway to Supabase and external APIs. The web frontend's sole config is `NEXT_PUBLIC_API_URL=http://localhost:8000` in `web/.env.local`.

### Backend (FastAPI + Async SQLAlchemy 2.0 + Supabase)

**Async-first**: All DB operations use `AsyncSession`. Models use `Mapped` type hints with `mapped_column()`. The `get_db` dependency yields async sessions.

**Supabase Auth**: Registration and login go through Supabase Auth (`sign_up`, `sign_in_with_password`). Token validation uses `supabase.auth.get_user(token)` in the `get_current_user` dependency (`app/utils/auth.py`). No local password hashing — User.id is the Supabase Auth UUID.

**Supabase Storage**: File uploads go to Supabase Storage buckets (`uploads`, `meshes`). Public URLs returned via `get_public_url()`. No local StaticFiles mount.

**Supabase PostgreSQL via pgBouncer**: The `DATABASE_URL` connects through Supabase's connection pooler (port 6543). The SQLAlchemy engine uses `statement_cache_size=0` in `connect_args` because pgBouncer doesn't support prepared statements.

**Router organization**: Each domain has a router in `app/routers/`, prefixed `/api/`. New routers must be exported via `app/routers/__init__.py` and registered in `app/main.py`.

**Alembic**: `alembic/env.py` reads `DATABASE_URL` from `.env` at runtime and automatically sets `statement_cache_size=0` for pgBouncer connections.

**Data model relationships**:
- Users own Builds and contribute Vehicles
- Builds reference one Vehicle + one Engine + optional Transmission, and have many ChatMessages
- Transmissions match Engines via bellhousing pattern strings
- ChatMessages store per-build advisor conversation history

**Data provenance**: Engine, Vehicle, and Transmission models track where each spec value came from via a `data_sources` JSON field (maps field name → `"manufacturer"` | `"carquery_api"` | `"nhtsa_api"` | `"user_contributed"`) and a `data_source_notes` text field for citations. User-submitted fields are auto-tagged `"user_contributed"`. Auto-enrichment fills null fields from APIs on entity creation.

**Services**:
| Service | Location | Purpose |
|---------|----------|---------|
| AdvisorService | `app/services/advisor.py` | Claude AI chat with data integrity rules, auto-persists history. Falls back to mock when `ANTHROPIC_API_KEY` unset |
| CarQueryClient | `app/services/carquery_client.py` | Free CarQuery API client for displacement, compression, bore/stroke, HP, torque, weight |
| SpecLookupService | `app/services/spec_lookup.py` | Orchestrates CarQuery + NHTSA lookups, merges results, enriches entities. Merge priority: NHTSA > CarQuery > existing |
| PDFService | `app/services/pdf_service.py` | WeasyPrint + Jinja2 templates in `app/templates/`. Requires system libs (`brew install cairo pango gdk-pixbuf libffi`). Returns 503 if unavailable |
| StorageService | `app/services/storage.py` | Supabase Storage uploads (buckets: `uploads`, `meshes`). Lazily instantiated in routers |
| VINDecoderService | `app/services/vin_decoder.py` | NHTSA API VIN decoding |
| get_supabase_client | `app/services/supabase_client.py` | Singleton Supabase client (LRU cached) for auth + storage |

### Web Frontend (Next.js 16 + shadcn/ui + React Three Fiber)

**App Router with route groups**: `(auth)/` for login/register (public), `(app)/` for everything else (auth-guarded via `AuthGuard` component in the layout).

**Auth flow**: JWT stored in `localStorage` under `swapspec_token`. `AuthContext` (`lib/auth-context.tsx`) provides `token`, `user`, `login()`, `register()`, `logout()`. On load, validates stored token via `GET /api/auth/me`. On 401, clears token and redirects to `/login`.

**API client**: `lib/api-client.ts` is a typed fetch wrapper. Auto-injects Bearer token, handles FormData for uploads, blob downloads for PDF export. Every backend endpoint has a corresponding typed function.

**Type alignment**: `lib/types.ts` contains TypeScript interfaces matching every backend Pydantic schema. When backend schemas change, update this file. Includes `DataSourceType` union and `DataSources` record type for provenance tracking.

**Data fetching**: Custom `useApi` hook (`hooks/use-api.ts`) wraps fetch with loading/error/refetch state. Domain-specific hooks (`use-vehicles.ts`, etc.) provide parameterized queries.

**UI stack**: shadcn/ui (New York style) with Tailwind CSS v4, Lucide icons, Sonner toasts, next-themes (default dark). Components live in `components/ui/` (generated by shadcn). Add new shadcn components with `npx shadcn@latest add <name>`.

**3D Viewer**: React Three Fiber + drei in `components/viewer/`. `ModelViewer` wraps a Canvas with OrbitControls. `ModelLoader` switches between GLB/OBJ/STL loaders by file extension. Must be client-only (loaded via `next/dynamic` with `ssr: false`).

**Build detail page**: Three tabs — Overview (specs with source badges + PDF export), 3D Viewer (mesh rendering), Advisor (AI chat with markdown rendering via react-markdown). Source badges show colored labels (MFR/API/USER) indicating data provenance for each spec value.

### Unity Client (C#)

All scripts under `unity/Assets/Scripts/SwapSpec/`:

- **`Models/ApiModels.cs`** — `[Serializable]` data classes matching every backend response schema
- **`Services/ApiClient.cs`** — `UnityWebRequest`-based HTTP client with auth token management, JSON via `JsonUtility`, coroutine-based async
- **`Services/*Service.cs`** — One service per backend domain (Auth, Vehicle, Engine, Transmission, Build, Advisor, File)
- **`UI/*Screen.cs`** — MonoBehaviour screen controllers with `[SerializeField]` UI references wired in Unity Editor
- **`UI/ScreenManager.cs`** — Shows/hides screen GameObjects for navigation

All services are MonoBehaviours intended to live on a persistent `SwapSpecManager` GameObject. `ApiClient` handles auth token attachment automatically.

### Testing

Backend tests use pytest-anyio for async support. The test fixture in `tests/conftest.py` overrides `DATABASE_URL` to use SQLite (`aiosqlite`) and mocks the Supabase client (auth + storage) via `unittest.mock.patch` across four modules (`supabase_client`, `auth`, `routers.auth`, `storage`). Login in tests sends JSON (not form data). See `tests/test_api.py` for the mock setup pattern.

The web frontend has no test suite. Run `npm run build` to verify TypeScript correctness.

## Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL` — Supabase PostgreSQL via pooler (`postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres`)
- `SECRET_KEY` — App-level signing key (not used for auth tokens)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `ANTHROPIC_API_KEY` — Optional; enables AI advisor (mock fallback without it)

**Web** (`web/.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend URL (default `http://localhost:8000`)
