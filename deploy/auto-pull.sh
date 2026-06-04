#!/usr/bin/env bash
# Installed on the VPS at /usr/local/bin/ddots-autodeploy.sh and run every ~2 min
# by ddots-autodeploy.timer. Polls origin/main; if the prod tree is behind, resets
# to origin/main and runs deploy-prod.sh. This is the deploy path because the
# GitHub Actions -> SSH deploy job is currently not reaching the VPS.
set -Eeuo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export GIT_TERMINAL_PROMPT=0
APP_DIR=/var/www/ddotsmediajobs
cd "$APP_DIR"
exec 9>/tmp/ddots-autodeploy.lock
flock -n 9 || { echo "[$(date -Is)] run in progress, skip"; exit 0; }
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] && exit 0
echo "[$(date -Is)] auto-deploy ${LOCAL:0:7} -> ${REMOTE:0:7}"
git reset --hard origin/main
bash deploy/deploy-prod.sh
echo "[$(date -Is)] auto-deploy done at $(git rev-parse --short HEAD)"
