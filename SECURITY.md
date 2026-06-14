# Security

DdotsMediaJobs is a production UAE job portal handling real jobseeker and employer
data. This document summarises the security measures in place and how to report
issues.

## Reporting a vulnerability

Email **security@ddotsmediajobs.com** with details and reproduction steps. Please
do not open public GitHub issues for security reports. We aim to acknowledge
within 24 hours and patch critical issues within 72 hours. Good-faith research
that respects user privacy is welcome; please allow a reasonable fix window before
public disclosure.

## Measures in place

### Authentication & sessions
- Auth.js v5 (JWT sessions), `httpOnly` + `secure` + `sameSite` cookies.
- Passwords hashed with **bcrypt (12 rounds)**; existing hashes still verify.
- Password policy: ≥10 chars, upper + number + symbol; HaveIBeenPwned k-anonymity check on register.
- Account-enumeration safe: login returns a generic "Invalid email or password"; password reset always returns "If this email exists…".
- Rate limits (Redis): register 20/hr·IP, password reset 5/hr·IP, AI 50/hr·user.

### Authorization (IDOR)
- Every employer procedure verifies `session.user.id === resource.employerId` (e.g. `assertJobOwner` / `assertAppOwner` in `employer-ats`).
- Admin procedures require `role === 'admin'`; identity is taken from the session only — never from client input.
- Public token routes (offer, reference, interview scheduling) use unguessable UUID tokens.

### Input validation & injection
- All tRPC inputs are Zod-validated with length caps.
- Drizzle ORM parameterises all queries; the few raw `sql` uses interpolate via placeholders, never string concatenation.
- HTML (blog, job descriptions) sanitised with `sanitizeHtml` (isomorphic-dompurify) on save; React auto-escapes on render. `dangerouslySetInnerHTML` is used only for app-generated JSON-LD and already-sanitised content.
- AI inputs wrapped in `<user_content>` tags; AI responses validated with Zod before any DB write.
- Community Q&A strips phone numbers and emails from public posts.
- Scam-checker text is never persisted.

### HTTP security headers (`next.config.ts`)
- Content-Security-Policy (default-src 'self', frame-ancestors 'none', object-src 'none', form-action 'self', upgrade-insecure-requests).
- Strict-Transport-Security (1 year, includeSubDomains, preload).
- X-Frame-Options: DENY · X-Content-Type-Options: nosniff · X-XSS-Protection.
- Referrer-Policy: strict-origin-when-cross-origin.
- Permissions-Policy: `camera=(), microphone=(self), geolocation=()`.
- Cross-Origin-Opener-Policy + Cross-Origin-Resource-Policy: same-origin.
- `poweredByHeader: false` (no X-Powered-By).

### Files & storage
- Uploads go to Cloudflare R2 via presigned URLs; CV access is presigned (time-limited), never public.
- Server-side MIME/type + size validation before upload.

### Open redirect
- `callbackUrl` is accepted only when it starts with `/` and not `//`; otherwise it falls back to `/dashboard`.

### Webhooks
- Whapi: token via `x-whapi-token` or `Authorization`; rejects only on present-and-wrong; always 200 to avoid retry storms.
- Telegram: `secret_token` verified; admin commands gated by `TELEGRAM_ADMIN_CHAT_ID`.

### Graceful degradation
- Every optional integration (Resend, R2, Meilisearch, Pusher, Umami, Groq, Gemini, Deepgram, pgvector, Google Indexing, Cloudflare Workers AI) is disabled silently when its key is absent — missing config never crashes the app.

## Dependency status

Production runtime (`apps/web`) runs **Next.js 15.5.18** — patched against the
known middleware-bypass and React-flight RCE advisories. The remaining
`pnpm audit` findings are confined to **dev-only** tooling (`drizzle-kit`/`tsx`
→ esbuild; `react-email`'s nested Next.js used for email-template preview) and
do not ship in the production bundle.
