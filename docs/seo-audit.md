# DdotsMediaJobs — SEO Audit

**Repo:** ddotsmediajob · **Branch:** main @ `c212a66` · **Audited:** September 2026
**Scope:** 233 app files · 192 `page.tsx` · 96 public routes

## Summary

Of 16 reported issues, **4 are real**, **7 are non-issues**, and **5 were over-counted**. One root cause explains most of the inflated numbers. Only one file has been changed so far (`companies/page.tsx`, uncommitted).

---

## Root cause (explains ~80% of reported volume)

On **dynamic routes only**, Next flushes metadata *after* `</head>`, into `<body>`, past React's stream-completion marker (`$RC`). Browsers hoist it; a raw-HTML crawler does not see it.

Verified live as Googlebot:

| URL | Result |
|---|---|
| `/privacy`, `/terms`, `/whatsapp-groups` | title in `<head>` ✅ |
| `/jobs` | title in `<body>` ❌ |
| `/jobs/jobs-for-indians-in-uae` | title in `<body>` ❌ |

Local production build: **0 of 31** prerendered pages affected.

**Consequence:** one crawler pass reports the same page as *missing title* + *missing canonical* + *missing robots* + *duplicate H1* simultaneously, inflating counts 10–40×.

**Fix:** add live job slugs to `generateStaticParams` on `/jobs/[slug]` (already has `revalidate = 3600`). Prerendered pages emit into `<head>`. This alone should clear items 1, 8, 9 and much of 12.

---

## Findings

| # | Issue | Reported | Actual | Status |
|---|---|---|---|---|
| 1 | Meta/canonical outside `<head>` | 1,004 | confirmed live | **REAL** |
| 2 | LinkedIn 404 URL | — | 2 occurrences | BLOCKED |
| 3 | `/salary-guide` no H1 + robots conflict | 2 | 0 — H1 at L32, no robots key | none |
| 4 | `/companies` 135 H2 | 135 | 1 in a `.map()` | **FIXED** |
| 5 | JobPosting schema missing | all | exists (L136) | none |
| 6 | Organization schema missing | all | exists (L62) | none |
| 7 | BreadcrumbList missing | all | exists on 9 routes | none |
| 8 | Duplicate H1 | 462 | 0 rendered | none |
| 9 | Duplicate meta description | 420 | 0 in source | partial |
| 10 | Titles > 60 chars | 862 | 27 (14 worth fixing) | **REAL** |
| 11 | robots.txt over-blocking | 118 | 104, intentional | 1 tweak |
| 12 | Missing self-canonical | 946 | 29 of 96 (69.8%) | **REAL** |
| 13 | Broken heading order | — | 10 of 70 pages | **REAL** |
| 14 | URLs with spaces | 228 | 0 | none |
| 15 | URLs non-ASCII | 7 | 0 | none |
| 16 | `/employer/post` 9× 400 | 9 | 0 — 307 auth redirect | none |

---

## Non-issues — do not "fix"

**#3 `/salary-guide`** — `<h1>UAE Salary Guide 2026</h1>` already at line 32. `grep robots|noindex` = 0 matches; inherits `index, follow` from `layout.tsx:39`. Adding a second H1 would create a real defect.

**#5 JobPosting** — complete at `jobs/[slug]/page.tsx:136`, including `datePosted`, `employmentType`, `directApply`, `potentialAction`, and `baseSalary` as `MonetaryAmount` (the correct type). The supplied template would have regressed four things: raw HTML in `description`, `now + 30 days` for `validThrough` ignoring real expiry, invalid `PriceSpecification` for salary, and non-existent field names.

**#6 Organization** — `Organization` + `WebSite`/`SearchAction` complete at `page.tsx:62`. Supplied template was a subset; pasting it yields two conflicting `Organization` nodes.

**#7 BreadcrumbList** — present on `category/[slug]`, `jobs/[slug]`, `role-emirate`, `role-jobs`, `jobs-in/[emirate]`, `areas`, `interview-questions/[slug]`, `salary/[slug]`, `seo/intent-jobs-view`. Cannot go in `layout.tsx` — it's a server component with no `pathname`, and it would double-emit on those 9 routes.

**#8 Duplicate H1** — 11 files contain more than one `<h1>`, but all are conditional branches (`if`/ternary), so only one renders: `onboarding` (3×), `forgot-password`, `talent`, `verify/[hash]`, `talent/[username]`, `reference/[token]`, `quick-post`, `interview/[token]`, `interview/schedule/[token]`, `dashboard/assessments`, `verify-email`.

**#14/15 URL characters** — structurally impossible. Every slug passes `slugify()`: `.replace(/[^a-z0-9\s-]/g,'')` strips non-ASCII, `.replace(/\s+/g,'-')` removes spaces. Zero static route folders contain a space or non-ASCII character. The reported figures were likely `?q=` query URLs the crawler constructed itself.

**#16 `/employer/post`** — returns `307` → `/login?callbackUrl=%2Femployer%2Fpost`. 21 of 22 static assets return `200`. No 400s exist. Re-crawl authenticated, or exclude `/employer`, `/admin`, `/dashboard`.

---

## Real issues, prioritised

**P1 — Metadata streaming (item 1).** Prerequisite for everything else. Without it, canonical and title fixes on dynamic routes stay invisible to the crawler that flagged them.

**P2 — `/jobs` has no canonical** and accepts `?q ?page ?category ?emirate ?sort`. Largest duplicate-content surface on the site. *Decision needed:* Option A (facets self-canonicalise, `sort` excluded) or Option B (all variants → `/jobs`, losing filtered pages from the index).

**P3 — `/visa-guide` and `/nafis-guide` have no `<h1>` anywhere.** Indexable content pages with zero H1.

**P4 — 14 titles exceed 60 chars.** Three genuinely double-brand, rendering `… | DdotsMediaJobs | DdotsMediaJobs`:

- `jobs/[slug]/role-emirate.tsx:44`
- `salary/[slug]/page.tsx:58`
- `interview-questions/[slug]/page.tsx:28`

Fix is to delete the hardcoded suffix; the template re-adds it. **Note:** titles using `title: { absolute: … }` bypass the template and are *not* double-branded — leave those alone.

**P5 — 29 public pages missing self-canonical** (69.8% compliant). 19 need one; 10 should be `noindex` instead — token-gated (`interview/[token]`, `reference/[token]`, `offer/[token]`, `join/[code]`, `verify/[hash]`, `unsubscribe`), personal (`notifications`, `saved`), and PWA (`offline`).

**P6 — 10 of 70 public pages have broken heading order:**

```
/                                  h1 h3 h2      skips h2
/companies                         h1 h3         skips h2 (caused by fix #4)
/cv-builder                        h1 h3 h3 h3 h2 h2 h3
/community/events                  h3 h1 h2 h2   h1 not first
/community/leaderboard             h2 h1 h2      h1 not first
/visa-guide                        h3 h2 h3      no h1
/nafis-guide                       h3            no h1
/jobs/jobs-for-indians-in-uae      h3 h3 h3      no h1 in file — h1 likely
/jobs/jobs-for-filipinos-in-dubai  h3 h3 h3      from shared intent view;
/jobs/jobs-for-pakistanis-in-uae   h3 h3 h3      verify at runtime
```

**P7 — 21 public pages inherit the generic `SITE.description`.** 112 pages lack metadata in total, but 91 of those are `noindex`.

---

## Blockers discovered during implementation

**A. 14 of 15 pages needing new metadata are `'use client'`.** You cannot export `metadata` from a client component — Next ignores it silently: no canonical emitted, no error. Affected: `community`, `community/become-mentor`, `community/leaderboard`, `community/mentors`, `community/volunteers`, `compare`, `copilot`, `quick-post`, `success-stories/submit`, `swipe`, `tools/job-scam-checker`, `volunteer`, `community/[id]`, `companies/[slug]/review`. Requires a sibling server `layout.tsx` per route (14 new files), or splitting each page into a server shell plus client child.

**B. `/pricing/page.tsx` is a redirect stub** — the entire file is `redirect('/employer/post')`. It never emits HTML, so a canonical there is unreachable. Remove it from the canonical list.

**C. `/companies/[slug]/tour` already has `robots: { index: false }`.** A canonical on a noindex page is contradictory.

**D. Net deliverable for canonicals is 3 files**, not 5 or 17:

- `jobs/page.tsx` — add `SITE` import, move `SP` type above `generateMetadata`, add Option A logic
- `tools/salary-comparison/page.tsx` — add `SITE` import, add `alternates`
- `community/ama/[slug]/page.tsx` — add `SITE` import, add `alternates`

---

## Incidental bugs (not SEO, worth fixing)

**E. `slugify()` deletes non-ASCII instead of transliterating:**

| Input | Slug produced |
|---|---|
| `"Café Manager"` | `caf-manager` |
| `"وظائف في دبي"` | `""` → falls back to `job`, `job-x7k2` |

An Arabic-titled job gets a meaningless URL. Matters as Arabic posting scales — `titleAr`/`descriptionAr` already exist in the schema.

**F. `deploy/nginx.conf` proxies to `127.0.0.1:3000`** but `ecosystem.config.js` starts Next on **3200**. The live site works, so the deployed nginx differs from the repo copy — this will break on the next config deploy.

**G. `/jobs/jobs-for-indians-in-uae` returned `JobPosting = MISSING`** on live. It's a role-landing page (`role-jobs.tsx`), so it may need `ItemList`/`CollectionPage` rather than `JobPosting`.

**H. `robots.ts` blocks `/api/`**, which includes `/api/og/*` — the dynamic OG images. Social crawlers ignore robots.txt, but Google Images cannot fetch them. Suggest `allow: ['/api/og/']`. There is also no `/jobseeker/` rule (1 route currently crawlable).

**I. `/whatsapp-groups` title hardcodes `"76 Professional Communities"`** — will drift as groups are added.

---

## Decisions pending

1. Correct LinkedIn URL — current one 404s in two places: `page.tsx:79` (`sameAs` array) and `site-footer.tsx:27`
2. `/jobs` canonical — Option A or B
3. Titles — fix the 3 double-branded only, or all 14
4. Canonicals — 3 files now, or also the 14 client pages via `layout.tsx`
5. `/companies` sr-only h2 — "Featured Companies" (your wording) or "All companies" (accurate; the grid lists all)

---

## Verification caveat

No local Postgres this session. `/jobs` takes 45s+ locally and cannot render. All findings come from source analysis, local production build output, and live-site fetches as Googlebot. **Nothing was verified against a database.**
