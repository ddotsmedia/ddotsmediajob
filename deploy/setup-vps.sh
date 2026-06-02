#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────
# DdotsMediaJobs — VPS provisioning (Ubuntu 22.04/24.04). NO Docker.
#
# SAFE ON A SHARED VPS: this box may already run OTHER projects
# (including Docker ones). This script is deliberately NON-DESTRUCTIVE:
#   • never touches Docker, the firewall (ufw), or other vhosts
#   • detects services/ports already in use and REUSES / SKIPS them
#     instead of clobbering
#   • Nginx + TLS are OPT-IN (SETUP_NGINX=1) and only ADD our vhost
#
# Usage:
#   sudo bash deploy/setup-vps.sh                 # install missing infra only
#   sudo SETUP_NGINX=1 bash deploy/setup-vps.sh   # also add our nginx vhost+TLS
#
# Env knobs:
#   SETUP_NGINX=1      add an nginx server block for the domain + certbot
#   PG_PORT=5432       expected Postgres port (only used if we install PG)
#   DB_NAME / DB_USER  override created db name/user
# ───────────────────────────────────────────────────────────────────
set -Eeuo pipefail

DOMAIN="${DOMAIN:-ddotsmediajobs.com}"
DB_NAME="${DB_NAME:-ddotsmediajobs}"
DB_USER="${DB_USER:-ddots}"
PG_PORT="${PG_PORT:-5432}"
APP_DIR="${APP_DIR:-/var/www/ddotsmediajobs}"
SETUP_NGINX="${SETUP_NGINX:-0}"

log()  { printf '\033[36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m⚠ %s\033[0m\n' "$*"; }
skip() { printf '\033[35m↷ %s\033[0m\n' "$*"; }

port_busy() { ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$1\$"; }
have()      { command -v "$1" >/dev/null 2>&1; }
svc_active(){ systemctl is-active --quiet "$1" 2>/dev/null; }

echo "════════════════════════════════════════════════════════════"
echo " DdotsMediaJobs VPS setup — non-destructive / shared-box safe"
echo " Will NOT touch: Docker, ufw/firewall, other nginx vhosts."
echo "════════════════════════════════════════════════════════════"
[ "$(id -u)" = "0" ] || { echo "Run with sudo/root."; exit 1; }

if have docker && docker ps >/dev/null 2>&1; then
  warn "Docker detected with running containers — they will NOT be touched."
  docker ps --format '   • {{.Names}} ({{.Ports}})' 2>/dev/null || true
fi

log "Updating apt metadata (no upgrade of existing packages)…"
apt-get update -y
apt-get install -y curl git build-essential ca-certificates lsb-release

# ─── Node 22 + pnpm ─────────────────────────────────────────────────
# Read Node major via a script FILE (never a bare flag): some hosts wrap node as
# `exec node -- "$@"`, which turns `node -v`/`-p`/`-e` into a bogus module path.
node_major() {
  command -v node >/dev/null || { echo 0; return; }
  echo 'process.stdout.write(String(process.versions.node.split(".")[0]))' > /tmp/ddots-node-check.js
  node /tmp/ddots-node-check.js 2>/dev/null || echo 0
  rm -f /tmp/ddots-node-check.js
}
NODE_OK=0
NODE_MAJOR=$(node_major)
[ "${NODE_MAJOR:-0}" -ge 22 ] 2>/dev/null && NODE_OK=1
if [ "$NODE_OK" = "1" ]; then
  skip "Node (major ${NODE_MAJOR}) already present"
else
  log "Installing Node.js 22…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  NODE_MAJOR=$(node_major)
fi
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true
ok "node (major ${NODE_MAJOR:-?}), pnpm $(pnpm -v 2>/dev/null || echo '?')"

# ─── PostgreSQL 16 ──────────────────────────────────────────────────
if port_busy "$PG_PORT" && ! svc_active postgresql; then
  warn "Port $PG_PORT in use by a NON-postgresql service (likely a Docker container)."
  warn "Skipping host PostgreSQL install — point DATABASE_URL at the existing DB,"
  warn "or set PG_PORT=<free port> and re-run. NOT touching the running service."
elif have psql && svc_active postgresql; then
  skip "PostgreSQL already running — ensuring our db/user exist"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '$(openssl rand -hex 16)';"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  warn "Reusing existing PostgreSQL. If a NEW user was created above, reset its password and update .env."
else
  log "Installing PostgreSQL 16…"
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y && apt-get install -y postgresql-16
  systemctl enable --now postgresql
  DB_PASS="$(openssl rand -hex 16)"
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" || true
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || true
  echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}" >> /root/ddots-secrets.txt
  ok "PostgreSQL 16 installed; credentials appended to /root/ddots-secrets.txt"
fi

# ─── Redis 7 ────────────────────────────────────────────────────────
if svc_active redis-server || svc_active redis; then
  skip "Redis already running — reusing (not editing its config)"
elif port_busy 6379; then
  warn "Port 6379 in use (likely a Docker Redis) — skipping host Redis. Point REDIS_URL at it."
else
  log "Installing Redis 7…"
  apt-get install -y redis-server
  systemctl enable --now redis-server
  ok "Redis installed"
fi

# ─── Typesense ──────────────────────────────────────────────────────
if svc_active typesense-server; then
  skip "Typesense already running — reusing"
elif port_busy 8108; then
  warn "Port 8108 in use — skipping Typesense install. Point TYPESENSE_* at the existing instance."
else
  log "Installing Typesense…"
  TS_KEY="$(openssl rand -hex 16)"
  curl -fsSL -O https://dl.typesense.org/releases/27.1/typesense-server-27.1-amd64.deb
  apt-get install -y ./typesense-server-27.1-amd64.deb || true
  mkdir -p /var/lib/typesense
  cat >/etc/typesense/typesense-server.ini <<EOF
[server]
api-key = ${TS_KEY}
data-dir = /var/lib/typesense
api-address = 127.0.0.1
api-port = 8108
EOF
  systemctl enable --now typesense-server
  echo "TYPESENSE_API_KEY=${TS_KEY}" >> /root/ddots-secrets.txt
  ok "Typesense installed; key appended to /root/ddots-secrets.txt"
fi

# ─── PM2 ────────────────────────────────────────────────────────────
if have pm2; then
  skip "PM2 already installed"
else
  log "Installing PM2…"
  npm install -g pm2
  pm2 startup systemd -u "${SUDO_USER:-root}" --hp "/home/${SUDO_USER:-root}" >/dev/null 2>&1 || true
fi
ok "PM2 ready"

# ─── Nginx + TLS (OPT-IN, additive only) ────────────────────────────
if [ "$SETUP_NGINX" = "1" ]; then
  if { port_busy 80 || port_busy 443; } && ! svc_active nginx; then
    warn "Ports 80/443 are served by something OTHER than host nginx"
    warn "(likely a Docker reverse proxy / traefik). NOT installing host nginx —"
    warn "add a route for ${DOMAIN} → 127.0.0.1:3000 in your existing proxy instead."
  else
    log "Adding nginx vhost for ${DOMAIN} (additive — existing sites untouched)…"
    have nginx || apt-get install -y nginx
    have certbot || apt-get install -y certbot python3-certbot-nginx
    if [ -f "${APP_DIR}/deploy/nginx.conf" ]; then
      cp "${APP_DIR}/deploy/nginx.conf" "/etc/nginx/sites-available/${DOMAIN}"
      ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
    fi
    mkdir -p /var/www/certbot
    if nginx -t; then
      systemctl reload nginx
      certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos \
        -m "admin@${DOMAIN}" || warn "Certbot skipped/failed — run manually once DNS resolves."
    else
      warn "nginx -t failed — leaving config in place, NOT reloading (won't disturb running nginx)."
    fi
  fi
else
  skip "Nginx step skipped (set SETUP_NGINX=1 to add our vhost). App listens on 127.0.0.1:3000 — wire your existing proxy to it."
fi

echo ""
echo "════════════════════════════════════════════════════════════"
ok "Setup done. NOTHING belonging to other projects was modified."
echo "  • Firewall (ufw): NOT touched."
echo "  • Docker: NOT touched."
echo "  • Other nginx vhosts: NOT touched."
echo ""
echo "  Secrets (if any were generated): /root/ddots-secrets.txt"
echo "  Put DATABASE_URL / REDIS_URL / TYPESENSE_* into ${APP_DIR}/.env, then:"
echo "    cd ${APP_DIR} && bash deploy/deploy.sh"
echo "════════════════════════════════════════════════════════════"
