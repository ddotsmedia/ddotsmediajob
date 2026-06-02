# DdotsMediaJobs — Mobile (Expo / React Native)

Standalone Expo app that consumes the same `/api/trpc` backend as the web app.
Kept **out of the pnpm workspace** so its React Native dependency tree doesn't
affect the web build — install and run it separately.

## Run

```bash
cd apps/mobile
npm install          # (or pnpm install --ignore-workspace)
npx expo start       # press i / a for iOS / Android, or scan the QR in Expo Go
```

Point the app at your API by editing `extra.apiUrl` in `app.json`
(defaults to `https://ddotsmediajobs.com`; use your LAN IP for a local dev server).

## What's here
- `App.tsx` — navigation (Jobs → Job Detail), React Query provider, brand theme.
- `src/api.ts` — tiny tRPC-over-HTTP client (`jobs.list`, `jobs.bySlug`).
- `src/screens/` — Jobs list (search) and Job Detail (apply opens the web app).

## Build
Use EAS: `npx eas build -p android` / `-p ios`. App identifiers and brand colours
are set in `app.json` (teal `#339a9b`, deep teal `#0d2e2d`, orange CTA `#ea7a3c`).
