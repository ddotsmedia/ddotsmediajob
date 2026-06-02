# DdotsMediaJobs

The UAE job portal — [ddotsmediajobs.com](https://ddotsmediajobs.com).

Next.js 15 (App Router) · TypeScript strict · Tailwind v4 · tRPC v11 · Drizzle ORM + PostgreSQL 16 · Auth.js v5 · Typesense · Redis + BullMQ · Resend · Cloudflare R2 · Claude API. Deployed with **PM2 + Nginx (no Docker)**.

## Monorepo layout

```
jobportal/
├─ apps/
│  └─ web/                 # Next.js 15 app (SSR/SSG public site + dashboards)
├─ packages/
│  ├─ jobs-shared/  @ddots/shared   # constants (emirates, categories), zod validators, utils
│  ├─ db/           @ddots/db       # Drizzle schema, client, migrations, seed
│  ├─ auth/         @ddots/auth     # Auth.js v5 (Google + credentials)
│  ├─ api/          @ddots/api      # tRPC routers + integrations + BullMQ worker
│  └─ email/        @ddots/email    # React Email templates
├─ deploy/          # nginx.conf, setup-vps.sh
├─ ecosystem.config.js   # PM2 (web + worker)
└─ .github/workflows/deploy.yml
```

## Local development

Prerequisites: Node 22+, pnpm 10+, and locally running PostgreSQL 16, Redis 7, Typesense (or point env vars at remote instances).

```bash
pnpm install
cp .env.example .env          # fill in secrets
pnpm db:push                  # create schema (or db:migrate for SQL migrations)
pnpm db:seed                  # demo users, jobs, WhatsApp groups, salary data
pnpm --filter @ddots/api search:sync   # index jobs into Typesense
pnpm dev                      # web on http://localhost:3000
pnpm worker                   # (separate terminal) email + alerts + search worker
```

### Seeded logins

| Role     | Email                          | Password       |
|----------|--------------------------------|----------------|
| Admin    | admin@ddotsmediajobs.com       | `Admin#12345`  |
| Employer | employer@ddotsmediajobs.com    | `Employer#123` |
| Seeker   | seeker@ddotsmediajobs.com      | `Seeker#12345` |

## Key scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run all dev servers (Turborepo) |
| `pnpm build` | Production build |
| `pnpm typecheck` / `pnpm lint` | Strict TS + ESLint across packages |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |
| `pnpm db:seed` | Seed demo data |
| `pnpm worker` | BullMQ worker (email, job alerts, Typesense sync) |
| `pnpm --filter @ddots/api search:sync` | Reindex all active jobs |

## Features

- **Public (SSR/SSG):** homepage, job search with filters, job detail with **Google for Jobs JSON-LD** + dynamic OG images, 12 category SSG pages, 7 emirate SSG pages, company profiles, salary guide, WhatsApp groups directory, blog, dynamic `sitemap.xml` + `robots.txt`, PWA manifest.
- **Jobseekers:** dashboard, applications tracker, saved jobs, job alerts, profile + R2 resume upload.
- **Employers:** dashboard, **AI quick post** (Claude Haiku → structured draft), manage jobs, Kanban applications pipeline, company profile.
- **Admin:** stats, job approval queue, user management (roles + bans), blog editor, audit log.
- **Background:** BullMQ worker delivers transactional email (Resend + React Email), scans daily/weekly job alerts, and keeps Typesense in sync.

## Deployment (PM2 + Nginx, no Docker)

> **Shared-VPS safe.** This box runs other projects (some Dockerized). The scripts are deliberately scoped and non-destructive: they only ever touch `/var/www/ddotsmediajobs` and PM2 processes named `ddots-*`. `setup-vps.sh` **never** touches Docker, the firewall (`ufw`), or other nginx vhosts — it detects services/ports already in use (`5432/6379/8108/80/443`) and **skips or reuses** them instead of clobbering. The app listens on `127.0.0.1:3000`; Nginx is **opt-in** (`SETUP_NGINX=1`) and only *adds* a vhost. If a Docker reverse proxy already owns `80/443`, leave `SETUP_NGINX` off and point that proxy at `127.0.0.1:3000`. Generated secrets land in `/root/ddots-secrets.txt`.

Three automated entry points — pick one:

### A. Zero-to-live (brand-new VPS, one command)
On a fresh Ubuntu 22.04/24.04 box as root:
```bash
export REPO=git@github.com:ddotsmedia/ddotsmediajobs.git
# add `export SETUP_NGINX=1` too ONLY if no other proxy owns ports 80/443
curl -fsSL https://raw.githubusercontent.com/ddotsmedia/ddotsmediajobs/main/deploy/bootstrap.sh | bash
```
`bootstrap.sh` clones the repo, runs `setup-vps.sh` (installs only the infra that's *missing* — Node 22, PostgreSQL 16, Redis, Typesense, PM2; Nginx/Certbot only with `SETUP_NGINX=1`), then — once `.env` is filled — runs the full deploy. Secrets it generates go to `/root/ddots-secrets.txt`.

### B. Full deploy on the VPS (idempotent — first run *and* updates)
```bash
cd /var/www/ddotsmediajobs && bash deploy/deploy.sh
```
`deploy.sh` is the single source of truth: clone-or-pull → verify env → install → migrate → **seed only if the DB is empty** → build → reindex Typesense → start *or* zero-downtime `pm2 reload` → health-check. Knobs: `BRANCH=`, `SEED=auto|force|skip`, `PORT=`, `REPO=`.

### C. CI/CD (push to deploy)
Push to `main` → GitHub Actions runs typecheck + lint + build, then SSHes to the VPS and runs `deploy/deploy.sh`.
Repo secrets required: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

### From Windows
- `deploy.bat "commit message"` — commit + push (Actions deploys).
- `pwsh deploy/remote-deploy.ps1 -VpsHost <ip> -User <user> -Push` — push, then SSH in and run the full `deploy.sh` directly (no Actions).

> After cloning, mark the scripts executable once: `git update-index --chmod=+x deploy/*.sh`.

## Environment variables

See [`.env.example`](.env.example) — covers database, Auth.js + Google OAuth, Redis, Typesense, Resend, Cloudflare R2, and the Claude API (`claude-haiku-4-5` for templates, `claude-sonnet-4-6` for reasoning features).

## Brand

Teal `#2a9aa4`, Navy `#0f172a`, fonts Sora (display) + DM Sans (body), 4-dot 2×2 logo mark.
