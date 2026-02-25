# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # uses --legacy-peer-deps automatically via .npmrc
npm start                # Metro bundler + QR code for Expo Go
npm run ios              # iOS Simulator (requires full Xcode)
npm run android          # Android Emulator

npx expo install <pkg>   # always use this instead of npm install for new packages
```

**Physical device**: Set `EXPO_PUBLIC_API_URL` in `.env.local` to your Mac's LAN IP — `localhost` only works in the iOS Simulator.

## Architecture

**Expo SDK 54**, React Native 0.81, React 19, Expo Router v6 (file-based routing).

### Route Structure

```
app/
  index.tsx                    # redirects → /(auth)/login or /(app)/dashboard
  _layout.tsx                  # root layout: wraps all routes in <AuthProvider>
  (auth)/                      # public — login, register
  (app)/                       # auth-guarded tab navigator
    dashboard/index.tsx
    builds/
      index.tsx                # builds list
      new.tsx                  # 4-step creation wizard
      [buildId]/index.tsx      # build detail: Overview + Advisor tabs
    vehicles/index.tsx
    engines/index.tsx
    transmissions/index.tsx
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/types.ts` | Direct copy of `web/src/lib/types.ts` — keep in sync when backend schemas change |
| `lib/api-client.ts` | Typed fetch wrapper. Uses `expo-secure-store` for token storage instead of `localStorage`. File uploads use `{ uri, name, type }` RN format |
| `lib/auth-context.tsx` | Auth state + `useAuth()` hook. Token stored via `SecureStore`. Logout calls `router.replace('/(auth)/login')` |
| `lib/theme.ts` | Single source of truth for colors, spacing, radius, fontSize. Import from here — no inline magic numbers |
| `hooks/use-api.ts` | Generic `useApi<T>(fetcher, deps)` → `{ data, loading, error, refetch }` |

### Auth Guard

`app/(app)/_layout.tsx` checks `useAuth()` on every render and redirects to login if no token. The tab bar hides `builds/[buildId]` and `builds/new` routes (`href: null`).

### Styling

React Native `StyleSheet` only — no NativeWind/Tailwind. All style constants come from `lib/theme.ts`. Dark-first palette.

### Adding a New Screen

1. Create the file under `app/(app)/your-route/index.tsx`
2. If it needs a tab, add a `<Tabs.Screen>` entry in `app/(app)/_layout.tsx`
3. If it should be hidden from the tab bar, set `options={{ href: null }}`

### Dependency Notes

- `lucide-react-native` requires `react-native-svg` — already installed
- `.npmrc` sets `legacy-peer-deps=true` globally because `lucide-react-native` hasn't declared React 19 peer support yet (it works fine at runtime)
- Always use `npx expo install` for new packages so Expo picks the SDK-54-compatible version
