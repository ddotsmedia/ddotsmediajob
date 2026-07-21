#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────
# Atomic web deploy for ddotsmediajobs.com — kills the .next/PM2 race.
#
# Builds into apps/web/.next-staging, then atomically swaps it into place and
# restarts pm2. The LIVE .next is never touched until a build fully succeeds, so a
# failed or concurrent build can't corrupt what's being served. A flock serializes
# deploys: a second concurrent run exits immediately with "deploy already in progress".
#
#   bash /opt/ddotsmediajobs/deploy-atomic.sh
# ───────────────────────────────────────────────────────────────────
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/ddotsmediajobs}"
WEB="$APP_DIR/apps/web"
PORT="${PORT:-3200}"
LOCK="/tmp/ddots-deploy.lock"

# ── Single-flight: CI and manual deploys must never overlap. ──
exec 200>"$LOCK"
if ! flock -n 200; then
  echo "deploy already in progress"
  exit 17
fi

cd "$APP_DIR"
# Load env so the build sees DATABASE_URL etc. (Next reads apps/web/.env at runtime too.)
[ -f apps/web/.env ] && { set -a; . ./apps/web/.env; set +a; }

echo "▶ build → .next-staging"
rm -rf "$WEB/.next-staging"
# Run next directly (packages export raw TS via transpilePackages — no ^build needed) so
# turbo can't cache-replay or mis-key the distDir override. On failure `set -e` aborts here,
# BEFORE the swap, leaving the live .next untouched and the lock released on exit.
( cd "$WEB" && NEXT_BUILD_DIR=.next-staging pnpm exec next build )

# A complete build must have these manifests; bail (non-zero) if the build was partial.
test -f "$WEB/.next-staging/prerender-manifest.json" || { echo "✗ staging build incomplete"; exit 1; }

# next start reads its config (incl. distDir + a files[] list) from required-server-files.json.
# The staging build baked ".next-staging" into every path there; rewrite to ".next" so the
# runtime (distDir defaults to .next) resolves correctly after the swap.
sed -i 's#\.next-staging#.next#g' "$WEB/.next-staging/required-server-files.json"

echo "▶ swap .next atomically"
rm -rf "$WEB/.next-old"
[ -d "$WEB/.next" ] && mv "$WEB/.next" "$WEB/.next-old"
mv "$WEB/.next-staging" "$WEB/.next"

echo "▶ restart ddots-web"
pm2 restart ddots-web --update-env 2>/dev/null \
  || ( cd "$WEB" && pm2 start node_modules/next/dist/bin/next --name ddots-web --update-env -- start -H 127.0.0.1 -p "$PORT" )
pm2 save >/dev/null 2>&1 || true

echo "▶ health check :$PORT"
for i in $(seq 1 15); do
  c=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" || echo 000)
  if [ "$c" = "200" ]; then echo "✓ healthy (200) — $(git rev-parse --short HEAD)"; exit 0; fi
  sleep 2
done

# Unhealthy after swap → roll back to the previous build so the site never stays down.
echo "✗ unhealthy — rolling back to .next-old"
if [ -d "$WEB/.next-old" ]; then
  rm -rf "$WEB/.next"
  mv "$WEB/.next-old" "$WEB/.next"
  pm2 restart ddots-web --update-env
fi
exit 1
