# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwapSpec is an AI-driven engine swap planning platform. The repo has three components:
- **`backend/`** — Python FastAPI REST API
- **`web/`** — Next.js TypeScript frontend (App Router)
- **`mobile/`** — React Native / Expo mobile app (iOS + Android)

All clients talk exclusively to the FastAPI backend. None of them access Supabase directly.

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
npm install
npm run dev        # dev server (port 3000)
npm run build      # production build + TypeScript check
npm run lint
```

### Mobile (Expo)

All commands run from `mobile/`:

```bash
npm install        # uses --legacy-peer-deps automatically via .npmrc
npm start          # start Metro bundler + show QR code for Expo Go
npm run ios        # open iOS Simulator (requires full Xcode)
npm run android    # open Android Emulator
```

**Expo Go**: Scan the QR code from `npm start` with the Expo Go app on a physical device. Device and Mac must be on the same Wi-Fi. For physical devices, set `EXPO_PUBLIC_API_URL` in `mobile/.env.local` to your Mac's LAN IP (e.g. `http://192.168.1.x:8000`) — `localhost` only works in the iOS Simulator.

**Adding packages**: Always use `npx expo install <package>` instead of plain `npm install` so Expo picks the SDK-compatible version automatically.

## Architecture

### How the Components Connect

```
Browser (web/)    ──→ FastAPI (backend/) ──→ Supabase (Auth, PostgreSQL, Storage)
Expo app (mobile/)──→ FastAPI (backend/) ──↗       ↑
                                                    ├── CarQuery API (engine/vehicle specs)
                                                    ├── NHTSA vPIC API (VIN decoding)
                                                    └── charm.li (service manual ZIPs)
```

### Backend (FastAPI + Async SQLAlchemy 2.0 + Supabase)

**Async-first**: All DB operations use `AsyncSession`. Models use `Mapped` type hints with `mapped_column()`. The `get_db` dependency yields async sessions.

**Supabase Auth**: Registration and login go through Supabase Auth (`sign_up`, `sign_in_with_password`). Token validation uses `supabase.auth.get_user(token)` in the `get_current_user` dependency (`app/utils/auth.py`). No local password hashing — User.id is the Supabase Auth UUID.

**Supabase Storage**: File uploads go to Supabase Storage buckets (`uploads`, `meshes`). Public URLs returned via `get_public_url()`. No local StaticFiles mount.

**Supabase PostgreSQL via pgBouncer**: The `DATABASE_URL` connects through Supabase's connection pooler (port 6543). The SQLAlchemy engine uses `statement_cache_size=0` in `connect_args` because pgBouncer doesn't support prepared statements.

**Router organization**: Each domain has a router in `app/routers/`, prefixed `/api/`. New routers must be exported via `app/routers/__init__.py` and registered in `app/main.py`.

**Data model relationships**:
- Users own Builds and contribute Vehicles
- Builds reference one Vehicle + one Engine + optional Transmission, and have many ChatMessages
- Transmissions match Engines via bellhousing pattern strings
- ChatMessages store per-build advisor conversation history

**Data provenance**: Engine, Vehicle, and Transmission models track where each spec value came from via a `data_sources` JSON field (maps field name → `"manufacturer"` | `"carquery_api"` | `"nhtsa_api"` | `"user_contributed"`) and a `data_source_notes` text field. User-submitted fields are auto-tagged `"user_contributed"`. Auto-enrichment fills null fields from APIs on entity creation.

**Local dev mode**: Set `LOCAL_DEV=true` in `backend/.env` to bypass Supabase auth. Uses `app/services/local_auth.py` — JWT signed with `SECRET_KEY`, in-memory user store. Useful when `SUPABASE_URL`/`SUPABASE_ANON_KEY` are not set.

**Services**:
| Service | Location | Purpose |
|---------|----------|---------|
| AdvisorService | `app/services/advisor.py` | Claude AI chat with data integrity rules, auto-persists history. Falls back to mock when `ANTHROPIC_API_KEY` unset. Retrieves `[CHARM_MANUAL]` context via FTS before each chat. |
| CarQueryClient | `app/services/carquery_client.py` | Free CarQuery API for displacement, compression, bore/stroke, HP, torque, weight |
| SpecLookupService | `app/services/spec_lookup.py` | Orchestrates CarQuery + NHTSA lookups, merges results. Priority: NHTSA > CarQuery > existing |
| PDFService | `app/services/pdf_service.py` | WeasyPrint + Jinja2 templates in `app/templates/`. Requires `brew install cairo pango gdk-pixbuf libffi`. Returns 503 if unavailable |
| StorageService | `app/services/storage.py` | Supabase Storage uploads (buckets: `uploads`, `meshes`). Lazily instantiated in routers |
| VINDecoderService | `app/services/vin_decoder.py` | NHTSA API VIN decoding |
| get_supabase_client | `app/services/supabase_client.py` | Singleton Supabase client (LRU cached) for auth + storage |
| CharmDownloader | `app/services/charm_downloader.py` | Fetches charm.li year-index page, fuzzy-matches model with `difflib`, streams ZIP download |
| ManualExtractor | `app/services/manual_extractor.py` | Unzips and URL-decodes all folder/file names (pure stdlib) |
| GapAnalyzer | `app/services/gap_analyzer.py` | Checks 10 critical spec paths in an extracted manual directory; returns `GapReport(present, missing, broken)` |
| GapFiller | `app/services/gap_filler.py` | Calls Claude to generate spec HTML for missing sections; skips gracefully when `ANTHROPIC_API_KEY` unset |
| RAGIndexer | `app/services/rag_indexer.py` | Walks HTML files, strips tags via stdlib `html.parser`, upserts `ManualChunk` rows |
| ManualIngestor | `app/services/manual_ingestor.py` | Orchestrates full pipeline via FastAPI `BackgroundTasks`; tracks jobs in `_jobs` dict (in-memory) |

### Web Frontend (Next.js + shadcn/ui + React Three Fiber)

**App Router with route groups**: `(auth)/` for login/register (public), `(app)/` for everything else (auth-guarded via `AuthGuard` in the layout).

**Auth flow**: JWT stored in `localStorage` under `swapspec_token`. `AuthContext` (`lib/auth-context.tsx`) provides `token`, `user`, `login()`, `register()`, `logout()`. On load, validates stored token via `GET /api/auth/me`. On 401, clears token and redirects to `/login`.

**API client**: `lib/api-client.ts` is a typed fetch wrapper. Auto-injects Bearer token, handles FormData for uploads, blob downloads for PDF export.

**Type alignment**: `lib/types.ts` contains TypeScript interfaces matching every backend Pydantic schema. When backend schemas change, update this file and the equivalent in `mobile/lib/types.ts`.

**Data fetching**: `hooks/use-api.ts` wraps fetch with loading/error/refetch state. Domain-specific hooks (`use-vehicles.ts`, etc.) wrap it with typed API calls.

**UI stack**: shadcn/ui (New York style) with Tailwind CSS v4, Lucide icons, Sonner toasts, next-themes (default dark). Add shadcn components with `npx shadcn@latest add <name>`.

**3D Viewer**: React Three Fiber + drei in `components/viewer/`. Must be client-only — loaded via `next/dynamic` with `ssr: false`.

### Mobile Frontend (Expo SDK 54 + React Native 0.81 + React 19)

**Stack**: Expo Router v6 (file-based routing), React Native StyleSheet for styling, `lucide-react-native` for icons, `expo-secure-store` for token storage.

**Shared code with web**: `mobile/lib/types.ts` is a direct copy of `web/src/lib/types.ts`. `mobile/lib/api-client.ts` and `mobile/hooks/` are direct ports — same logic, same patterns, different storage mechanism (`SecureStore` vs `localStorage`).

**Route structure** mirrors the web app's route groups:
- `app/(auth)/` — login, register (public)
- `app/(app)/` — tab navigator (auth-guarded in layout), contains dashboard, builds, vehicles, engines, transmissions
- `app/(app)/builds/[buildId]/` — build detail with Overview and Advisor tabs
- `app/(app)/builds/new` — 4-step creation wizard (Vehicle → Engine → Transmission → Review)

**Auth guard**: `app/(app)/_layout.tsx` checks `useAuth()` and calls `router.replace('/(auth)/login')` if no token. The root `app/index.tsx` redirects to dashboard or login based on token presence.

**Theme**: Dark-first color palette defined in `lib/theme.ts` (colors, spacing, radius, fontSize constants). All screens import from this file — no inline magic numbers.

**Key difference from web**: File uploads use `{ uri, name, type }` objects (React Native's FormData format) instead of browser `File` objects. The `uploadFile`/`uploadMesh` functions in `api-client.ts` reflect this.

### Manual Ingestion Pipeline

`ManualChunk` rows store indexed plain text from Operation CHARM service manuals. PostgreSQL FTS (`to_tsvector` / `plainto_tsquery`) drives the search; `rag_indexer.py` falls back to `ILIKE` on SQLite so tests pass without PG.

The `/api/manuals/ingest` endpoint checks for existing chunks before queuing a download. To ingest a locally extracted manual directory (skipping the download step):

```bash
POST /api/manuals/ingest/local
{"manual_dir": "/absolute/path/to/manual", "make": "Toyota", "model": "Supra", "year": 1993}

# Poll until complete:
GET /api/manuals/status/{job_id}
```

charm.li URL structure: `https://charm.li/{Make}/{Year}/` (index), `https://charm.li/bundle/{Make}/{Year}/{Model+Engine}/` (ZIP download).

### Testing

Backend tests use pytest-anyio for async support. `tests/conftest.py` overrides `DATABASE_URL` to SQLite (`aiosqlite`) and mocks the Supabase client via `unittest.mock.patch` across four modules (`supabase_client`, `auth`, `routers.auth`, `storage`). Login in tests sends JSON (not form data).

**Known issue**: The test fixture patches `app.utils.auth.get_supabase_client`, but that module imports it lazily inside `_resolve_user_id`. All 24 tests currently fail with `AttributeError` — this is a pre-existing regression unrelated to the manual pipeline.

The web and mobile frontends have no test suites. Run `npm run build` (web) to verify TypeScript correctness.

## Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL` — Supabase PostgreSQL via pooler (`postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres`)
- `SECRET_KEY` — App-level signing key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `ANTHROPIC_API_KEY` — Optional; enables AI advisor and gap-filling (mock fallback without it)
- `LOCAL_DEV` — Set `true` to bypass Supabase auth (uses `local_auth.py` with JWT + bcrypt)
- `MANUALS_STORAGE_PATH` — Directory for downloaded/extracted manuals (default `./manuals`)

**Web** (`web/.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend URL (default `http://localhost:8000`)

**Mobile** (`mobile/.env.local`):
- `EXPO_PUBLIC_API_URL` — Backend URL. Use your Mac's LAN IP for physical devices (default `http://localhost:8000`)
