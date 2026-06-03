# Security Policy

## Reporting a vulnerability

Email **security@ddotsmediajobs.com** with details and reproduction steps.
Please do **not** open public issues or disclose publicly before a fix is released.

### Our commitment
- **Acknowledge** your report within **24 hours**.
- **Patch critical** vulnerabilities within **72 hours**.
- Keep you updated on progress and credit you (if desired) once resolved.

### Responsible disclosure
Give us a reasonable window to release a fix before any public disclosure. We will
not pursue legal action against good-faith research that respects user privacy,
avoids service disruption, and does not access or modify data beyond what is needed
to demonstrate the issue.

## Implemented controls (summary)
- **Transport/headers**: HSTS (preload), CSP, X-Frame-Options DENY, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, COOP, CORP.
- **Auth**: Auth.js v5 (httpOnly, secure cookies, CSRF), bcrypt password hashing,
  strong password policy (≥10 chars, upper/number/symbol), token-based email
  verification + password reset (no account enumeration), open-redirect-safe callbacks.
- **Authorization**: role checks enforced in the tRPC layer (not only Next.js
  middleware); ownership verified per resource; UUID identifiers throughout.
- **Input**: Zod validation on all tRPC inputs; server-side HTML sanitisation
  (DOMPurify) on all rich text before persistence.
- **AI**: prompt-injection wrapping + jailbreak detection, per-user rate limits,
  bounded `max_tokens`, structured outputs validated before DB writes.
- **SSRF**: admin URL import is https-only, blocks private/internal IP ranges,
  disallows redirects, with 5s/1MB caps.
- **Webhooks**: Twilio signature verification; per-sender rate limiting.
- **Rate limiting**: Redis-backed limits on auth, applications, AI, uploads, webhooks.
- **Privacy**: passwords/tokens/PII never logged; employer access to seeker contact
  details gated by application status; anonymous job postings hide employer identity.

## Operational hardening
See `deploy/harden-vps.sh` for host hardening (firewall, fail2ban, service binds,
unattended upgrades). It is **opt-in** and must be reviewed before running on a
shared host — see the warnings in that file.
