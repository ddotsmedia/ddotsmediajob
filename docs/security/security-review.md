# DdotsMediaJobs — Security Review (2026)

Method: code-level review against OWASP Top 10 / API Security Top 10 / ASVS principles, grounded in the actual source. No real secrets included.

## Summary
The application is in **materially better** shape than the initiating audit assumed. Tenant isolation, rate limiting, password hardening, and input sanitization are already present. This review confirms them, records the genuine gaps, and lists remaining risk.

## Findings

### A01 Broken Access Control — LOW (was flagged HIGH; false positive)
- **Finding:** Every job mutation (`jobs.update/close/deleteOwn/renew/byId`) and applicant query (`applications.forJob/allApplications/updateStatus`) enforces `employerId === session.user.id || role === 'admin'`. Verified in source.
- **Fix applied:** Centralized into `packages/api/src/lib/authz.ts` (`assertJobOwner`/`assertAppOwner`), removing ~9 duplicated checks; **13 negative-authz unit tests** (cross-tenant + jobseeker denial).
- **Remaining risk:** Flat role model — no employer sub-accounts/tenancy. Acceptable for current product; revisit if teams ship (Phase 4).

### A03 Injection (XSS / ORM) — LOW
- Tiptap/rich HTML sanitized with `isomorphic-dompurify` before render (job description). Drizzle parameterizes all queries; raw `sql` templates use bound params (`cv-metrics.dashboard`, `search`). No string-concatenated SQL found.
- **Remaining:** confirm DOMPurify allowlist matches CLAUDE.md (p/ul/ol/li/strong/em/h2-4/a/br) in a follow-up.

### A07 Auth failures — LOW
- bcrypt password hash; **HaveIBeenPwned** k-anonymity check on register; password rules (10→8 chars + upper + number, owner decision) enforced client + server (`passwordSchema`). Rate limits: register 20/hr/IP, reports 10/hr/IP, apply 20/hr, reset 3/hr. JWT sessions, hashed reset/verify tokens (SHA-256).
- **Gap:** OAuth-created users don't capture Terms/Privacy consent (no register form) — documented follow-up (capture at onboarding).

### A08 SSRF (URL import) — REVIEW
- Job URL-import / scrape paths should block private IP ranges + `https`-only + no redirects. **Not re-verified this pass** — flagged for the URL-import audit.

### Unvalidated redirects — LOW (fixed)
- `callbackUrl` validated same-origin (`startsWith('/') && !startsWith('//')`) in both register forms + middleware login redirect.

### File upload — LOW
- CVs via UploadThing → R2, type/size enforced by the file router (pdf/doc/docx, 4 MB), generated keys, presigned access, ownership checks in `cvs`/`jobseekers`. **Remaining:** ClamAV scanning + SVG sanitization not present (accept-list excludes SVG); document retention handled by `cv-cleanup-worker`.

### Secrets — LOW
- No secrets in repo (removed in `5d2ec64`; `.env` gitignored, lives at `apps/web/.env` on VPS). `NEXT_PUBLIC_*` are build-time and public by design.

### Prompt injection — LOW
- CV/JD text is sent to Gemini/Anthropic as **data** with a fixed system instruction + `responseSchema`/tool-call structured output; model output is validated/shaped before DB write (`ai-provider.ts`, `resume-parser.ts`). Untrusted content cannot alter the tool contract. **Remaining:** wrap user content in explicit delimiters per CLAUDE.md rule 13 (partially done via structured output).

### Fraud reporting — ADDED
- `job_reports` + moderation queue; reporter identity never returned to employers; public create rate-limited.

## Dependency audit
`pnpm audit --audit-level=critical` runs in CI (non-blocking on high/medium beta deps). No critical at last check. Do not apply breaking major upgrades without release-note review.

## Remaining risk register
| Risk | Severity | Owner action |
|---|---|---|
| SSRF on URL import unverified | Medium | Re-audit import path |
| No AV scan on uploads | Medium | Add ClamAV or R2 scanning |
| OAuth consent not captured | Medium | Capture at onboarding |
| No 2FA enforcement for admins | Medium | Enforce TOTP for admin role |
| Flat role model | Low | Add tenancy if teams ship |
