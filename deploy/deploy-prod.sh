#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────
# DdotsMediaJobs — production update for THIS server (ddotsmediajobs.com).
# Tailored to the live box: shared host, Node 20, app on port 3050,
# reuses host Postgres/Redis, fronted by existing host nginx.
# The CI workflow does `git pull` first, then runs this. Safe to run by hand:
#   bash /opt/ddotsmediajobs/deploy/deploy-prod.sh
# ───────────────────────────────────────────────────────────────────
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/ddotsmediajobs}"
PORT="${PORT:-3200}"
cd "$APP_DIR"

# Env lives at apps/web/.env on the VPS. Load it if present; warn (don't abort)
# if it's missing so a transient state never blocks a deploy.
ENV_FILE="apps/web/.env"
if [ -f "$ENV_FILE" ]; then
  set -a; . "./$ENV_FILE"; set +a
else
  echo "⚠ $ENV_FILE missing — deployment may fail"
fi
export PORT
# Ensure drizzle-kit migrate sees DATABASE_URL even if the sourcing above was skipped.
export DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\"' || true)"

echo "▶ install"; pnpm install --frozen-lockfile
echo "▶ privacy guard"; node scripts/check-public-email.mjs
echo "▶ migrate"; pnpm db:migrate

# Atomic build + swap + web restart + health, serialized by flock (kills the .next race).
# A concurrent CI/manual deploy exits 17 ("deploy already in progress") — treat as success.
echo "▶ atomic web deploy"
bash "$APP_DIR/deploy-atomic.sh" || { rc=$?; [ "$rc" = "17" ] && { echo "another deploy is finishing it — ok"; exit 0; }; exit "$rc"; }

echo "▶ (re)start worker"
if pm2 describe ddots-worker >/dev/null 2>&1; then
  pm2 restart ddots-worker --update-env
else
  ( cd packages/api && pm2 start node_modules/.bin/tsx --name ddots-worker --update-env -- src/worker.ts )
fi
pm2 save >/dev/null 2>&1 || true
