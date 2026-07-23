# DdotsMediaJobs — Full Platform Audit 2026 (Phase 0 Baseline)

Status: **Phase 0 — Discovery & Baseline complete.** Remediation (Phases 1–22) is a multi-session program executed in small, separately-committed, additive phases. This document is the baseline; it will be updated as phases land.

## 1. Architecture discovered

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5.18 (App Router), React 19, TypeScript 5.7 strict |
| Runtime | Node 22 (VPS) / 20 CI; pnpm 10 workspaces + Turbo monorepo |
| Packages | `apps/web`, `packages/{api,db,auth,jobs-shared,email,search}` (all export raw `./src/*.ts`) |
| Auth | Auth.js/NextAuth v5, JWT sessions, DrizzleAdapter; Google/Facebook/LinkedIn/Twitter OAuth + credentials |
| DB / ORM | PostgreSQL 16, Drizzle ORM; migrations in `packages/db/drizzle` (0001–0049) |
| API | tRPC v11 (`publicProcedure`/`protectedProcedure`/`employerProcedure`/`adminProcedure`) |
| Storage | Cloudflare R2 + UploadThing (CV/logo/image) |
| Email | Resend + React Email |
| Search | Typesense/Meilisearch (jobs), plus ILIKE fallback |
| Queue/cron | BullMQ worker (`ddots-worker` pm2), lazy-expire guard in queries |
| AI | Native Gemini Vision (resume parse) + Anthropic Claude fallback; `ai-provider.ts` cascade |
| Deploy | Self-hosted VPS, pm2 (`ddots-web` :3200), nginx, GitHub Actions CI. **Atomic deploy** via `deploy-atomic.sh` (flock + `.next-staging` swap) |
| Monitoring | Structured console logs; no Sentry/APM wired |
| Tests | **NONE** — no vitest/jest/playwright config present |

### Roles (actual)
`userRoleEnum = ['jobseeker','employer','admin','volunteer']` — a **flat** role model on `users.role`. There is **no** employer-member/owner/recruiter tenancy, no separate moderator/super-admin (Phase 3's richer model is aspirational, not present).

### Key flows (as built)
- **Registration**: `auth.register` (rate-limited, HIBP pwned check, bcrypt) → credentials signIn → `/onboarding`. Two register UIs: `/(auth)/register` and `/auth/register` (2-step).
- **Onboarding**: `/onboarding` intent pick → CV upload (Gemini parse, auto `cv_searchable=true`) → confirmation. "Hire Talent" calls `auth.becomeEmployer` (grants employer immediately).
- **Job lifecycle**: `jobs.status` enum PENDING→active/rejected/expired; `jobs.create` (protected, auto-upgrades any user to employer), lazy-expire in queries.
- **Application**: `applications` table, guest + internal; external WhatsApp/URL supported.
- **Uploads**: UploadThing `cvUploader` → R2; presigned; ownership checks in cvs router.

## 2. Current build & test status
- **Production build**: PASSES (`pnpm -F web build`, exit 0 — verified repeatedly this session, latest at `daaa12a`; 430 static routes; ~6 min on VPS).
- **Typecheck**: passes (part of build; strict, `noUncheckedIndexedAccess` on).
- **Lint**: passes with **warnings** (unused vars/imports in several files — non-blocking).
- **Tests**: **none exist** — Phase 20/22 "run existing tests" has nothing to run. Adding vitest + Playwright is net-new tooling.
- **Deploy**: atomic (flock + staging swap); prior CI-vs-manual `.next` race is fixed.

## 3. Confirmed defects (reproduced in source)

| # | Severity | Finding | Evidence |
|---|---|---|---|
| C1 | High | Registration has **no confirm-password, no Terms/Privacy consent checkbox, no consent storage** | `register-flow.tsx` / `register-form.tsx`: 0 matches for confirm/terms/consent; `schema.ts`: 0 consent columns |
| C2 | High | "Hire Talent" **auto-grants employer** publishing rights (audit Phase 1 §17 violation) | `auth.becomeEmployer` + `jobs.create` auto-upgrade |
| C3 | High | CV upload **auto-sets `cv_searchable=true`** (opt-out, not opt-in) — PDPL/GDPR consent gap | `jobseekers.setResume`, `cvs.parseCv` (flagged in prior tasks) |
| C4 | Med | **Salary badge lies**: shows "Salary shown" whenever `!salaryHidden`, even with no salary numbers | `job-card.tsx:142` |
| C5 | Med | **Homepage stats hardcoded AND contradictory**: "120,000+ members" (page) vs "80,000+ members" (sidebar); "76 groups" hardcoded in 3+ places | `page.tsx:105,137,138`, `home-sidebar.tsx:135-136` |
| C6 | Med | **Job-page titles double-brand**: `generateMetadata` appends `| DdotsMediaJobs` manually while root already sets `template: '%s | DdotsMediaJobs'` → `… | DdotsMediaJobs | DdotsMediaJobs` | `jobs/[slug]/page.tsx` generateMetadata |
| C7 | Med | **No test coverage** for any auth/authz/job/application workflow | no test runner |
| C8 | Low | Missing soft-404: removed job slugs return **HTTP 200** (soft-404) not 404 | `jobs/[slug]` renders not-found UI at 200 (flagged earlier) |

## 4. False positives / already-fixed (do NOT re-do)
Verified already-correct in current code — several were fixed earlier this session:
- Root metadata **title template is correct** (`%s | DdotsMediaJobs`) — only job pages double-append (C6).
- Auth pages **already `noindex`** (`/auth/register` robots index:false).
- Registration **already has**: live password checklist (8+/upper/number, matched to server schema), show/hide toggle, callbackUrl same-origin validation, HIBP pwned-password block, rate limiting.
- **Employer/tenant reads already gated**: `cvs.search` is `employerProcedure`; job/CV pages middleware-gated; `/jobseeker` now gated.
- **Atomic deploy** already solves the production `.next` race + 502s.
- **JobPosting JSON-LD, sitemap, robots, security headers/CSP** exist (per CLAUDE.md phase history + next.config CSP verified).
- **Forgot-password** already returns generic response; reset tokens hashed (SHA-256) per auth router.

## 5. Proposed migration impact
All additive (session rule + audit §19). Planned:
- **Consent** (Phase 1): `users.terms_accepted_at`, `privacy_accepted_at`, `accepted_terms_version`, `accepted_privacy_version`, `marketing_opt_in` — all nullable, backfill none.
- **Employer onboarding** (Phase 4): `employer_profiles.onboarding_status` enum (NOT_STARTED…SUSPENDED); verification levels table (email/phone/domain/licence) — additive.
- **Job lifecycle** (Phase 5): widen `job_status` enum (add DRAFT, CHANGES_REQUESTED, PAUSED, FILLED, ARCHIVED) — **enum-add only, never drop**; `salary_visibility` varchar; `work_arrangement`.
- **Application** (Phase 7): `application_source`, status-history table, external-CTA-click table (separate from applications).
- **Reports/audit** (Phase 9/18): `job_reports`, extend `audit_logs`.

Risk: enum widening + column adds are online, non-locking on Postgres for these sizes. No column drops, no data rewrites without a dry-run repair script (audit §19).

## 6. Implementation plan (priority order, one commit each)
1. **`audit:`** this document (now).
2. **`fix(auth):`** registration confirm-password + Terms/Privacy consent (checkbox + `*_accepted_at/version` columns, migration 0050) + wire both register UIs. *(C1)*
3. **`fix(data):`** central salary-state utility (`DISCLOSED_RANGE|FIXED|NEGOTIABLE|ON_APPLICATION|NOT_DISCLOSED`); fix badge to read real numbers. *(C4)*
4. **`fix(seo):`** stop double-brand on job/company pages; add soft-404→404; canonical audit. *(C6, C8)*
5. **`fix(content):`** single `PlatformStats` source of truth; reconcile 120k/80k/76. *(C5)*
6. **`feat(safety):`** job/employer report flow + external-channel warning interstitial + moderation queue. *(Phase 9)*
7. **`fix(authz):`** centralize policies (`requireCandidate`/`canManageJob`/`canViewApplication`…) + negative tests. *(Phase 3)*
8. **`feat(employer):`** onboarding status + separated verification levels (retire single `verified` boolean). *(Phase 4)*
9. **`test:`** add vitest + Playwright; unit tests for salary/phone/URL/authz/state-machines; e2e for register/login/apply/cross-tenant. *(Phase 20)*
10. **`docs:`** security-review, privacy-gap, troubleshooting, deployment, manual-QA. *(Phases 10/18/21)*

Consent (C1), the auto-grant (C2), and auto-searchable (C3) are the highest-risk items and lead the queue. C2/C3 also require a **product/legal decision** (do you want opt-in consent + explicit employer approval, or keep the current "everything free/open" model?) — flagged, not silently changed.
