# Production Troubleshooting Guide

Infra: self-hosted VPS `194.164.151.202`, app at `/opt/ddotsmediajobs`, pm2 `ddots-web` (port 3200) + `ddots-worker`, nginx `proxy_pass 127.0.0.1:3200`, Postgres 16, Redis, GitHub Actions CI. Deploys via `deploy-atomic.sh` (flock + `.next-staging` swap; keeps `.next-old` for rollback).

## Quick health
```
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/     # app direct
curl -s -o /dev/null -w '%{http_code}' https://ddotsmediajobs.com/ # public via nginx
pm2 describe ddots-web | grep -E 'status|restarts'
pm2 logs ddots-web --lines 50 --nostream
```

## Login failures
- Check `AUTH_SECRET`, `NEXTAUTH_URL` in `apps/web/.env`. Credentials use bcrypt; HIBP check can block a breached password at *register* (not login).
- Rate limit: 5–20/window per IP/user (Redis). If Redis is down, rate-limit calls should fail-open — verify `REDIS_URL`.
- Session issues after deploy: JWT secret unchanged? Rotating `AUTH_SECRET` invalidates all sessions.

## Registration failures
- 0050 consent columns must exist (`\d users` → `terms_accepted_at`). Missing → `pnpm db:migrate`.
- "acceptedTerms" required — client must send it; a 400 with that message means the checkbox wasn't ticked.

## Email delivery (Resend)
- `RESEND_API_KEY` set? Worker enqueues welcome/verify/reset via BullMQ. Check `ddots-worker` logs. Failed sends shouldn't block registration (enqueue is async).

## Job publication failures
- `jobs.create` auto-upgrades any user to employer, extracts `extracted_*`. A 500 here → check DB + that migrations 0044–0051 applied. Status starts `pending` unless admin.

## Upload failures (CV/logo)
- UploadThing token (`UPLOADTHING_TOKEN/SECRET`) + R2 creds. Type/size rejected client-side (pdf/doc/docx 4 MB). Parse runs after upload (`cvs.parseCv`) and never blocks the upload.

## Database
- `psql "$DATABASE_URL"` from `apps/web/.env`. Migration state: `SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;`. Apply pending: `pnpm db:migrate`.

## OAuth
- `OAuthAccountNotLinked` = an email already registered via credentials tries Google. Expected safety behavior (no silent linking). Google client id/secret in env; redirect URI must match `NEXTAUTH_URL`.

## Sitemap / robots
- Both are route handlers. If 500: check the DB query for active jobs. Must return `application/xml`, 200, only indexable jobs.

## Scheduler / cron
- BullMQ repeatable jobs in `ddots-worker`. If digests/cleanup don't run: is `ddots-worker` online in pm2? Redis reachable? Idempotency guards prevent double-processing.

## 504 / timeouts
- Long AI calls must never block core flows — parse is fire-and-forget/awaited-with-timeout. If nginx 504: check pm2 process is up and `next start` bound to 3200.

## The `.next` build race (historical)
- Fixed by `deploy-atomic.sh`. If you see ENOENT `nft.json`/`prerender-manifest.json`: a build was interrupted. Re-run `deploy-atomic.sh` (flock serializes; staging swap keeps live `.next` intact).

## Rollback
```
cd /opt/ddotsmediajobs/apps/web
rm -rf .next && mv .next-old .next   # restore previous build (deploy-atomic keeps .next-old)
pm2 restart ddots-web --update-env
```
Then `git reset --hard <previous-good-sha>` and redeploy. Migrations are additive — a rollback of code does not require a DB down-migration (columns are unused by old code).
