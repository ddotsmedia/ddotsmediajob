#!/bin/bash
# Deploy main to the production VPS. Retries the SSH connection up to 3 times.
set -euo pipefail

HOST="root@194.164.151.202"
REMOTE="cd /opt/ddotsmediajobs && git pull origin main && pnpm install --frozen-lockfile && pnpm db:migrate && pnpm run build && pm2 restart ddots-web && pm2 save && echo DEPLOYED_OK"

for attempt in 1 2 3; do
  echo "[deploy] attempt $attempt → $HOST"
  if ssh -o ConnectTimeout=10 -o ConnectionAttempts=3 "$HOST" "$REMOTE"; then
    echo "DEPLOY SUCCESS"
    exit 0
  fi
  echo "[deploy] attempt $attempt failed"
  sleep 5
done

echo "DEPLOY FAILED"
exit 1
