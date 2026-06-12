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
PORT="${PORT:-3050}"
cd "$APP_DIR"

[ -f .env ] || { echo "✗ .env missing in $APP_DIR"; exit 1; }
set -a; . ./.env; set +a
export PORT

echo "▶ install"; pnpm install --frozen-lockfile
echo "▶ privacy guard"; node scripts/check-public-email.mjs
echo "▶ migrate"; pnpm db:migrate
echo "▶ build";   pnpm build

echo "▶ (re)start web"
if pm2 describe ddots-web >/dev/null 2>&1; then
  pm2 restart ddots-web --update-env
else
  ( cd apps/web && pm2 start node_modules/next/dist/bin/next --name ddots-web --update-env -- start -H 127.0.0.1 -p "$PORT" )
fi

echo "▶ (re)start worker"
if pm2 describe ddots-worker >/dev/null 2>&1; then
  pm2 restart ddots-worker --update-env
else
  ( cd packages/api && pm2 start node_modules/.bin/tsx --name ddots-worker --update-env -- src/worker.ts )
fi
pm2 save >/dev/null 2>&1 || true

echo "▶ health check :$PORT"
for i in $(seq 1 12); do
  C=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" || echo 000)
  if [ "$C" = "200" ]; then echo "✓ healthy (HTTP 200) — $(git rev-parse --short HEAD)"; exit 0; fi
  sleep 2
done
echo "✗ not healthy"; pm2 logs ddots-web --lines 30 --nostream || true; exit 1
