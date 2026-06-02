#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  DdotsMediaJobs — zero-to-live bootstrap for a brand-new VPS.
#  Provisions the box, then runs a full first deploy.
#
#  Usage (as root on a fresh Ubuntu 22.04/24.04 server):
#    export REPO=git@github.com:ddotsmedia/ddotsmediajobs.git
#    curl -fsSL https://raw.githubusercontent.com/ddotsmedia/ddotsmediajobs/main/deploy/bootstrap.sh | bash
#  …or after cloning:
#    sudo REPO=<git-url> bash deploy/bootstrap.sh
# ═══════════════════════════════════════════════════════════════════
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/ddotsmediajobs}"
REPO="${REPO:?Set REPO=<git-clone-url> before running}"
BRANCH="${BRANCH:-main}"

echo "▶ Bootstrapping DdotsMediaJobs on this VPS…"

# 1. Clone repo (needed so setup-vps.sh / nginx.conf are available)
if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR" 2>/dev/null || {
    apt-get update -y && apt-get install -y git
    git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
  }
fi
cd "$APP_DIR"

# 2. Provision system services (Node, PG, Redis, Typesense, Nginx, PM2, Certbot)
bash deploy/setup-vps.sh

# 3. Ensure .env exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠ Created .env from template. Fill in the secrets printed above, then run:"
  echo "    cd $APP_DIR && bash deploy/deploy.sh"
  exit 0
fi

# 4. Full first deploy
REPO="$REPO" BRANCH="$BRANCH" bash deploy/deploy.sh

echo "✅ DdotsMediaJobs is live."
