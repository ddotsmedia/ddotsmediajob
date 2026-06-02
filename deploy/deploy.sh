#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  DdotsMediaJobs — complete automated deploy (run ON the VPS).
#
#  Idempotent: detects first run vs update and does the right thing.
#    • clones or pulls the repo
#    • verifies required env vars exist
#    • installs deps, runs migrations, builds
#    • seeds ONLY if the database is empty
#    • reindexes Typesense
#    • starts (first run) or zero-downtime reloads PM2
#    • health-checks the app and rolls log
#
#  Usage:
#    bash deploy/deploy.sh                 # deploy current checkout
#    REPO=git@github.com:org/repo.git bash deploy/deploy.sh   # clone if missing
#    SEED=force bash deploy/deploy.sh      # force re-seed (DESTRUCTIVE)
#    BRANCH=main bash deploy/deploy.sh
# ═══════════════════════════════════════════════════════════════════
set -Eeuo pipefail

# ─── Config (override via env) ──────────────────────────────────────
APP_DIR="${APP_DIR:-/var/www/ddotsmediajobs}"
REPO="${REPO:-}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3000}"
HEALTH_PATH="${HEALTH_PATH:-/}"
SEED="${SEED:-auto}"            # auto | force | skip
PM2_APP="ddots-web"

log()  { printf '\033[36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m⚠ %s\033[0m\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

trap 'die "deploy failed at line $LINENO"' ERR

START_TS=$(date +%s)

# ─── 1. Tooling check ───────────────────────────────────────────────
log "Checking tooling…"
command -v node >/dev/null || die "node not found — run deploy/setup-vps.sh first"
command -v git  >/dev/null || die "git not found"
if ! command -v pnpm >/dev/null; then
  warn "pnpm missing — enabling via corepack"
  corepack enable && corepack prepare pnpm@latest --activate
fi
if ! command -v pm2 >/dev/null; then
  warn "pm2 missing — installing globally"
  npm install -g pm2
fi
NODE_MAJOR=$(node -v | sed 's/^v\([0-9]*\).*/\1/')
[ "${NODE_MAJOR:-0}" -ge 22 ] 2>/dev/null || die "Node 22+ required (have $(node -v))"
ok "node $(node -v), pnpm $(pnpm -v 2>/dev/null || echo '?')"

# ─── 2. Get the code ────────────────────────────────────────────────
if [ ! -d "$APP_DIR/.git" ]; then
  [ -n "$REPO" ] || die "$APP_DIR is not a git checkout and REPO is unset"
  log "Cloning $REPO → $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
  FIRST_RUN=1
else
  FIRST_RUN=0
fi
cd "$APP_DIR"

log "Fetching latest ($BRANCH)…"
git fetch --all --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
ok "at $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# ─── 3. Env check ───────────────────────────────────────────────────
[ -f .env ] || die ".env missing in $APP_DIR — copy from .env.example and fill secrets"
set -a; # shellcheck disable=SC1091
source .env; set +a
REQUIRED=(DATABASE_URL AUTH_SECRET NEXT_PUBLIC_APP_URL REDIS_URL)
MISSING=()
for v in "${REQUIRED[@]}"; do [ -n "${!v:-}" ] || MISSING+=("$v"); done
[ ${#MISSING[@]} -eq 0 ] || die "missing env vars: ${MISSING[*]}"
ok "env ok"

# ─── 4. Install deps ────────────────────────────────────────────────
log "Installing dependencies…"
pnpm install --frozen-lockfile
ok "deps installed"

# ─── 5. Migrate DB ──────────────────────────────────────────────────
log "Running migrations…"
pnpm db:migrate
ok "schema migrated"

# ─── 6. Seed (auto: only if empty) ──────────────────────────────────
seed_needed() {
  # returns 0 if the jobs table is empty / missing
  local count
  count=$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM jobs;" 2>/dev/null || echo "ERR")
  [ "$count" = "0" ] || [ "$count" = "ERR" ]
}
case "$SEED" in
  force) log "Seeding (forced)…"; pnpm db:seed ;;
  skip)  warn "Seed skipped" ;;
  auto)
    if command -v psql >/dev/null && seed_needed; then
      log "Database empty — seeding demo data…"; pnpm db:seed
    else
      ok "Seed not needed"
    fi ;;
esac

# ─── 7. Build ───────────────────────────────────────────────────────
log "Building…"
pnpm build
ok "build complete"

# ─── 8. Reindex search (non-fatal) ──────────────────────────────────
log "Syncing Typesense…"
pnpm --filter @ddots/api search:sync || warn "search sync failed (Typesense down?) — continuing"

# ─── 9. Start / reload PM2 ──────────────────────────────────────────
mkdir -p logs
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  log "Zero-downtime reload…"
  pm2 reload ecosystem.config.js --env production --update-env
else
  log "First start…"
  pm2 start ecosystem.config.js --env production
fi
pm2 save
ok "PM2 running"

# ─── 10. Health check ───────────────────────────────────────────────
log "Health check on :$PORT$HEALTH_PATH…"
HEALTHY=0
for i in $(seq 1 20); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}${HEALTH_PATH}" || echo 000)
  if [ "$CODE" = "200" ] || [ "$CODE" = "307" ] || [ "$CODE" = "308" ]; then HEALTHY=1; break; fi
  sleep 2
done
if [ "$HEALTHY" -ne 1 ]; then
  pm2 logs "$PM2_APP" --lines 40 --nostream || true
  die "app did not become healthy (last code: ${CODE:-?})"
fi
ok "healthy (HTTP $CODE)"

ELAPSED=$(( $(date +%s) - START_TS ))
[ "$FIRST_RUN" = "1" ] && MODE="FIRST DEPLOY" || MODE="UPDATE"
printf '\n\033[32m═══ %s complete in %ss — %s ═══\033[0m\n' "$MODE" "$ELAPSED" "$(git rev-parse --short HEAD)"
