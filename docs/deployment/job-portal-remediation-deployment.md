# Remediation Deployment & Rollback

## Prerequisites
- SSH to `root@194.164.151.202`; app at `/opt/ddotsmediajobs`.
- Env at `apps/web/.env` (not in repo). Node 22 on VPS.
- Migrations 0044–0051 are additive (CV search, ATS, candidate settings, consent, reports). None drop columns.

## Standard deploy (atomic — preferred)
```
ssh root@194.164.151.202
cd /opt/ddotsmediajobs
git fetch origin -q && git reset --hard origin/main -q
bash deploy-atomic.sh          # flock + build into .next-staging + swap + pm2 restart + health check
```
`deploy-atomic.sh` guarantees: the live `.next` is untouched until a build fully succeeds; a second concurrent deploy exits "deploy already in progress"; rollback-on-failed-health to `.next-old`.

## Deploy WITH new dependency or migration
Use the fuller path (installs + migrates, then delegates to atomic):
```
bash deploy/deploy-prod.sh     # pnpm install --frozen-lockfile → db:migrate → deploy-atomic.sh
```
Required when a commit adds a dependency (e.g. `pdf-parse`, `vitest`) or a migration (0050 consent, 0051 reports).

## Migration execution
- `pnpm db:migrate` (drizzle-kit). Additive `ALTER TABLE ADD COLUMN` / `CREATE TABLE` — online, non-locking at current row counts. Expected time: seconds.
- Verify: `psql "$DATABASE_URL" -c '\d users'` (consent cols), `'\d job_reports'`, `'\d cv_scores'`, `'\d cv_ai_metrics'`.

## Verification after deploy
```
curl -s -o /dev/null -w 'live:%{http_code}\n' https://ddotsmediajobs.com/
curl -s -o /dev/null -w 'job:%{http_code}\n'  https://ddotsmediajobs.com/jobs
grep -c next-staging apps/web/.next/required-server-files.json   # must be 0 (distDir sed applied)
pm2 describe ddots-web | grep -E 'status|unstable'
```
- Static SEO pages are SSG — after a title/metadata change, confirm the served `<title>` (a clean rebuild is needed; `deploy-atomic.sh` produces it).

## Rollback
1. Restore the previous build instantly:
   ```
   cd /opt/ddotsmediajobs/apps/web && rm -rf .next && mv .next-old .next && pm2 restart ddots-web --update-env
   ```
2. Revert code: `git reset --hard <previous-sha>` then `bash deploy-atomic.sh`.
3. **Migrations are NOT rolled back** — they are additive and unused by prior code, so leaving them is safe. Only write a down-migration if a column actively breaks the older code (none here do).

## CI
GitHub Actions runs lint/typecheck/build on push, then SSHes to run `deploy/deploy-prod.sh`. The flock in `deploy-atomic.sh` serializes CI vs any manual deploy.
