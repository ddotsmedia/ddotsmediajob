#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  DdotsMediaJobs — OPTIONAL VPS hardening. REVIEW BEFORE RUNNING.
#
#  ⚠️  THIS BOX IS SHARED with other live projects. Several hardening
#  steps are HOST-WIDE and can break other apps or lock you out.
#  Each dangerous step is gated behind an explicit flag so nothing
#  destructive runs by accident. This script is NEVER called by
#  bootstrap.sh or deploy.sh.
#
#  Safe-by-default actions (always run): fail2ban, unattended-upgrades.
#  Gated actions (set the flag to enable):
#    ENABLE_UFW=yes        configure+enable firewall  ⚠ will block any
#                          port not explicitly allowed — ADD your other
#                          projects' published ports first (see below).
#    REDIS_PASSWORD=...    set a Redis password (updates ddots .env too)
#    HARDEN_SSH=yes        disable SSH password login ⚠ ensure your key
#                          works first or you WILL be locked out.
#
#  Usage:  sudo bash deploy/harden-vps.sh
# ═══════════════════════════════════════════════════════════════════
set -Eeuo pipefail
[ "$(id -u)" = 0 ] || { echo "Run as root."; exit 1; }
log(){ printf '\033[36m▶ %s\033[0m\n' "$*"; }
warn(){ printf '\033[33m⚠ %s\033[0m\n' "$*"; }

log "fail2ban (SSH + nginx brute-force protection)"
apt-get install -y fail2ban >/dev/null 2>&1 || true
cat >/etc/fail2ban/jail.d/ddots.conf <<'EOF'
[sshd]
enabled = true
maxretry = 3
bantime = 1h
findtime = 10m

[nginx-http-auth]
enabled = true
maxretry = 20
findtime = 5m
bantime = 1h
EOF
systemctl enable --now fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban >/dev/null 2>&1 || true

log "unattended security upgrades"
apt-get install -y unattended-upgrades >/dev/null 2>&1 || true
echo 'APT::Periodic::Unattended-Upgrade "1";' >/etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Update-Package-Lists "1";' >>/etc/apt/apt.conf.d/20auto-upgrades

# ── Redis password (gated) ──────────────────────────────────────────
if [ -n "${REDIS_PASSWORD:-}" ]; then
  log "Setting Redis password + updating app .env"
  sed -i "s/^# *requirepass .*/requirepass ${REDIS_PASSWORD}/" /etc/redis/redis.conf || true
  grep -q "^requirepass" /etc/redis/redis.conf || echo "requirepass ${REDIS_PASSWORD}" >> /etc/redis/redis.conf
  systemctl restart redis-server
  ENVF=/var/www/ddotsmediajobs/.env
  [ -f "$ENVF" ] && sed -i "s#^REDIS_URL=.*#REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379#" "$ENVF"
  warn "Other projects using this Redis must also update their REDIS_URL."
else
  warn "Redis password skipped (set REDIS_PASSWORD=... to enable)."
fi

# ── Firewall (gated, dangerous on shared box) ───────────────────────
if [ "${ENABLE_UFW:-no}" = "yes" ]; then
  warn "Configuring ufw. Add EXTRA_PORTS='3020 5100 ...' for other projects' published ports."
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
  for p in ${EXTRA_PORTS:-}; do ufw allow "${p}/tcp"; done
  ufw --force enable
else
  warn "Firewall skipped (set ENABLE_UFW=yes + EXTRA_PORTS to enable). On a shared box this can block other projects."
fi

# ── SSH hardening (gated, lockout risk) ─────────────────────────────
if [ "${HARDEN_SSH:-no}" = "yes" ]; then
  warn "Disabling SSH password auth — confirm your key works in another session FIRST."
  sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  systemctl reload ssh || systemctl reload sshd || true
else
  warn "SSH hardening skipped (set HARDEN_SSH=yes to enable). Ensure key login works first."
fi

echo "✅ Baseline hardening applied (fail2ban + auto-upgrades). Gated steps ran only where flagged."
