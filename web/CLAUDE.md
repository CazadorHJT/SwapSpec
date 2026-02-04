# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server (port 3000)
npm run build      # production build (also validates TypeScript)
npm run lint       # ESLint

# Add a new shadcn component
npx shadcn@latest add <name>
```

There is no test suite. Use `npm run build` to verify TypeScript correctness after changes.

## Architecture

Next.js 16 App Router frontend for SwapSpec, an engine swap planning platform. Talks exclusively to a FastAPI backend — no direct Supabase access. The only env var is `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

### Route Groups & Auth Guard

Routes are split into two groups under `src/app/`:

- **`(auth)/`** — Public routes: `/login`, `/register`
- **`(app)/`** — Protected routes: everything else. The `(app)/layout.tsx` wraps children in `<AuthGuard>` + `<AppShell>`. AuthGuard checks `useAuth()` and redirects to `/login` if unauthenticated.

The root layout (`src/app/layout.tsx`) wraps all routes with `AuthProvider`, `ThemeProvider`, and `Toaster`.

### Auth Flow

JWT is stored in `localStorage` under `swapspec_token`. `AuthContext` (`lib/auth-context.tsx`) provides `token`, `user`, `login()`, `register()`, `logout()`. On mount, validates the stored token via `GET /api/auth/me`. On any 401, the API client clears the token and redirects to `/login`.

### API Client

`lib/api-client.ts` is a typed fetch wrapper around the backend. Key behaviors:

- Auto-injects `Authorization: Bearer <token>` header from localStorage
- Skips `Content-Type` for FormData bodies (file uploads)
- On 401, clears token and redirects to `/login`
- Every backend endpoint has a corresponding exported typed function (`getVehicles`, `createBuild`, `decodeVin`, etc.)

### Type Alignment

`lib/types.ts` contains TypeScript interfaces matching every backend Pydantic schema. When backend schemas change, this file must be updated manually. Includes `DataSourceType`, `QualityStatus`, `VehicleCreate`, `BuildExport`, etc.

### Data Fetching

`hooks/use-api.ts` exports a generic `useApi<T>(fetcher, deps)` hook that returns `{ data, loading, error, refetch }`. Domain-specific hooks in `hooks/` (`use-vehicles.ts`, `use-engines.ts`, `use-builds.ts`, `use-transmissions.ts`) wrap `useApi` with typed API calls and parameterized queries.

### UI Stack

- **shadcn/ui** (New York style) — generated components in `components/ui/`. Config in `components.json`.
- **Tailwind CSS v4** — theme defined inline in `globals.css` via `@theme` block with CSS custom properties. No `tailwind.config` file.
- **Lucide React** — icons
- **Sonner** — toast notifications
- **next-themes** — dark mode (default dark)
- **Geist** font family (Sans + Mono) via `next/font`

### Key Component Patterns

**Build detail page** (`builds/[buildId]/page.tsx`): Three tabs — Overview (specs with data source badges + PDF export), 3D Viewer (mesh rendering), Advisor (AI chat with markdown via react-markdown + remark-gfm).

**Build creation wizard** (`components/builds/build-create-wizard.tsx`): Four-step wizard (Vehicle → Engine → Transmission → Review). Step 0 includes a VIN decoder above vehicle filters. Each step uses domain-specific `useApi` calls.

**VIN decoder** (`components/vehicles/vin-decoder.tsx`): Decodes VINs via the backend NHTSA endpoint. Optionally accepts `onVehicleCreated` and `existingVehicles` props to enable creating vehicles from decoded results with duplicate detection.

**3D Viewer** (`components/viewer/`): React Three Fiber + drei. `ModelViewer` wraps Canvas with OrbitControls. `ModelLoader` switches between GLB/OBJ/STL loaders by file extension. Must be client-only (`next/dynamic` with `ssr: false`).

**Data source badges**: Build overview shows colored badges (MFR/API/USER) next to each spec value, derived from the entity's `data_sources` JSON field.

### Vehicle Visibility

Vehicles have a `quality_status` field (`pending` | `approved` | `rejected`). The backend filters the list endpoint: authenticated users see approved vehicles + their own pending vehicles. Unauthenticated users see only approved. The frontend should expect newly created vehicles to appear as `pending`.

### Next.js Config

- `images.remotePatterns` allows `**.supabase.co` for Supabase Storage images
- `transpilePackages: ["three"]` for Three.js compatibility
