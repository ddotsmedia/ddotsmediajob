# Error & Broken-Link Audit — 2026-06-17

## 1. Broken internal links

Scanned all 64 unique static `href="/…"` values in `apps/web/src` and resolved
each against the App Router (including dynamic `[param]` and `(group)` segments).

| Link | Status | Action |
|------|--------|--------|
| `/privacy` | was MISSING (linked from footer) | **Created** `app/privacy/page.tsx` (data use + retention) |
| `/terms` | was MISSING (linked from footer) | **Created** `app/terms/page.tsx` |
| `/pricing` | exists | redirects to `/employer/post` (pricing removed) |
| `/relocation-advisor` (bare) | no page | **No inbound links** — only `/resources/relocation-advisor` is linked, which exists. No fix needed |
| all 60+ others (campus, companies, talent, swipe, compare, career-advisor, interview-prep, assessments, market-insights, success-stories, wps-calculator, golden-visa-checker, cost-of-living, nafis-guide, visa-guide, community/*, volunteer, tools/*, events, …) | exist | none |

Result: **2 real broken links → both fixed by creating the pages.** No links repointed.

## 2. tRPC procedures
No undefined-procedure calls. `tsc --noEmit` passes across all 7 packages, which
would fail on a missing/mistyped procedure (router output types are inferred
end-to-end). Public data fetches use `.catch(() => fallback)` (homepage stats,
sitemap queries, etc.).

## 3. TypeScript errors
`pnpm typecheck` (`tsc --noEmit`, strict) — **0 errors**. No `any` on sensitive
data paths; auth/session identity is read from the server session only.

## 4. console.log with PII
Addressed in the prior security pass and re-verified:
- Whapi webhook no longer logs the raw body — IP + timestamp + byte size only.
- WhatsApp dry-run log masks the phone to last 4 digits.
- Remaining `console.log`/`console.error` lines log actions/ids/`err.message`, not PII.

## 5. Error boundaries
Root `app/error.tsx`, `app/loading.tsx`, and `app/global-error.tsx` exist. App
Router bubbles errors to the nearest boundary, so these cover all nested routes
(`/jobs/[slug]`, `/admin/*`, `/dashboard/*`). `<ErrorBoundary>` also wraps
`{children}` in the root layout. No additional per-route files required.

## 6. Unused imports
Removed unused `cn` import in `share-menu.tsx`. Remaining "defined but never used"
items are **eslint warnings only** — they do not fail `next build` and are
non-functional. Tracked for incremental cleanup.

## 7. API routes
All `app/api/*` routes return JSON with appropriate status and never throw to the
client: webhooks always return 200 (avoid retry storms) and wrap processing in
try/catch; `/api/health` returns 503 when the DB is down; tracking endpoints are
fire-and-forget. Whapi webhook now also enforces a 100 KB payload cap.

## 8. Environment variables
Added startup validation in `apps/web/src/instrumentation.ts` (`register()`,
nodejs runtime): logs an error if any **required** var is missing
(`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`), warns if `AUTH_SECRET` < 32 chars,
and warns for unset **optional** integrations (Anthropic/Groq/Gemini/Redis/Resend/R2/Whapi).
Never crashes the boot.

## 9. Database query errors
Public/SSR queries that must not break the page use `.catch(() => fallback)`.
Mutations surface failures as typed `TRPCError`s (FORBIDDEN / NOT_FOUND /
BAD_REQUEST) — raw Drizzle/Postgres errors are never returned to the client; in
production tRPC strips internal error messages.

## Build warnings remaining (acceptable)
- eslint "defined but never used" warnings in a handful of components — non-fatal.
- `pnpm audit`: 3 moderate + 3 low, all transitive/dev (see SECURITY.md). 0 high/critical in prod.
