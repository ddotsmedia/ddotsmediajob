/**
 * BullMQ worker process. Run with: pnpm worker  (or via PM2 — see ecosystem.config.js)
 * Handles: transactional email, Typesense sync, and scheduled job-alert delivery.
 */
import { Worker } from 'bullmq';
import {
  db,
  jobs,
  jobAlerts,
  applications,
  jobseekerProfiles,
  siteSettings,
  notifications,
  users,
  eq,
  and,
  gt,
  lt,
  desc,
  ilike,
  or,
  inArray,
  isNotNull,
} from '@ddots/db';
import { formatSalary, CATEGORIES } from '@ddots/shared';
import { QUEUE, bullConnection, getRedis, enqueueEmail, jobAlertsQueue, maintenanceQueue, type EmailJob, type SearchSyncJob, type AlertScanJob, type AiScoringJob, type MaintenanceJob, type JobEventJob, type WhapiImportJob } from './lib/queue';
import { extractAndSaveDraft, sendWhapiText } from './lib/import';
import { expireStaleJobs } from './lib/helpers';
import { sendEmailJob, sendAlertEmail } from './lib/email';
import { ensureJobsCollection, upsertJobDocument, deleteJobDocument, jobToDocument } from './lib/typesense';
import { ensureJobsIndex as ensureMeiliIndex, upsertJob as meiliUpsert, deleteJob as meiliDelete, jobRowToDoc } from './lib/meili';
import { structured, MATCH_TOOL, MODEL_SMART, MODEL_FAST, type MatchResult } from './lib/anthropic';
import { deleteObjectByUrl } from './lib/r2';

const connection = bullConnection();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ddotsmediajobs.com';

// ── Email worker ─────────────────────────────────────────
new Worker<EmailJob>(
  QUEUE.email,
  async (job) => {
    await sendEmailJob(job.data);
  },
  { connection, concurrency: 5 },
).on('failed', (job, err) => console.error(`[email] ${job?.id} failed:`, err.message));

// ── Search-sync worker ───────────────────────────────────
new Worker<SearchSyncJob>(
  QUEUE.search,
  async (job) => {
    await ensureJobsCollection();
    await ensureMeiliIndex();
    if (job.data.type === 'delete') {
      await deleteJobDocument(job.data.jobId);
      await meiliDelete(job.data.jobId);
      return;
    }
    const row = await db.query.jobs.findFirst({
      where: eq(jobs.id, job.data.jobId),
      with: { company: { columns: { name: true } } },
    });
    if (!row || row.status !== 'active') {
      await deleteJobDocument(job.data.jobId);
      await meiliDelete(job.data.jobId);
      return;
    }
    await upsertJobDocument(jobToDocument(row, row.company?.name));
    await meiliUpsert(jobRowToDoc(row, row.company?.name));
  },
  { connection, concurrency: 5 },
).on('failed', (job, err) => console.error(`[search] ${job?.id} failed:`, err.message));

// ── Job-alerts scan worker ───────────────────────────────
new Worker<AlertScanJob>(
  QUEUE.jobAlerts,
  async (job) => {
    const { frequency } = job.data;
    const since = new Date(Date.now() - (frequency === 'weekly' ? 7 : 1) * 86_400_000);

    const activeAlerts = await db.query.jobAlerts.findMany({
      where: and(eq(jobAlerts.isActive, true), eq(jobAlerts.frequency, frequency)),
      with: { user: { columns: { name: true, email: true } } },
    });

    for (const alert of activeAlerts) {
      const conds = [eq(jobs.status, 'active'), gt(jobs.publishedAt, alert.lastSentAt ?? since)];
      if (alert.categorySlug) conds.push(eq(jobs.categorySlug, alert.categorySlug));
      if (alert.emirateSlug) conds.push(eq(jobs.emirateSlug, alert.emirateSlug));
      if (alert.jobType) conds.push(eq(jobs.jobType, alert.jobType));
      if (alert.keywords) {
        conds.push(or(ilike(jobs.title, `%${alert.keywords}%`), ilike(jobs.description, `%${alert.keywords}%`))!);
      }

      const matches = await db.query.jobs.findMany({
        where: and(...conds),
        orderBy: [desc(jobs.publishedAt)],
        limit: 10,
        with: { company: { columns: { name: true } } },
      });

      const recipient = alert.user?.email ?? alert.email;
      if (matches.length && recipient) {
        await enqueueEmail({
          type: 'job-alert',
          to: recipient,
          name: alert.user?.name ?? 'there',
          jobs: matches.map((m) => ({
            title: m.title,
            companyName: m.company?.name ?? 'Employer',
            location: m.location ?? m.emirateSlug,
            salary: formatSalary(m.salaryMin, m.salaryMax, m.salaryPeriod, m.salaryHidden),
            url: `${APP_URL}/jobs/${m.slug}`,
          })),
          // Anonymous alerts unsubscribe via token; account alerts manage in the dashboard.
          ...(alert.token ? { unsubscribeUrl: `${APP_URL}/unsubscribe?token=${alert.token}` } : {}),
        });
      }
      await db.update(jobAlerts).set({ lastSentAt: new Date() }).where(eq(jobAlerts.id, alert.id));
    }
  },
  { connection, concurrency: 1 },
).on('failed', (job, err) => console.error(`[alerts] ${job?.id} failed:`, err.message));

// ── AI scoring worker (match + fraud on new application) ──
const FRAUD_TOOL = {
  name: 'fraud_check',
  description: 'Score fraud/misrepresentation risk in a job application.',
  input_schema: {
    type: 'object' as const,
    properties: {
      score: { type: 'integer', description: '0 (genuine) - 100 (likely fraudulent)' },
      flags: { type: 'array', items: { type: 'string' } },
    },
    required: ['score', 'flags'],
  },
};

new Worker<AiScoringJob>(
  QUEUE.aiScoring,
  async (job) => {
    const app = await db.query.applications.findFirst({ where: eq(applications.id, job.data.applicationId) });
    if (!app) return;
    const jobRow = await db.query.jobs.findFirst({ where: eq(jobs.id, app.jobId) });
    if (!jobRow) return;

    let profileText = app.coverLetter ?? '';
    if (app.seekerId) {
      const p = await db.query.jobseekerProfiles.findFirst({ where: eq(jobseekerProfiles.userId, app.seekerId) });
      if (p) {
        profileText = [
          `Headline: ${p.headline ?? '—'}`,
          `Experience: ${p.experienceLevel ?? '—'}`,
          `Skills: ${(p.skills ?? []).join(', ') || '—'}`,
          `Bio: ${p.bio ?? '—'}`,
          `Cover letter: ${app.coverLetter ?? '—'}`,
        ].join('\n');
      }
    }

    // Match score (Sonnet-class).
    const match = await structured<MatchResult>(
      'You are an expert UAE recruiter. Score candidate-job fit honestly and concisely.',
      `JOB:\nTitle: ${jobRow.title}\nDescription: ${jobRow.description.slice(0, 2000)}\n\nCANDIDATE:\n${profileText.slice(0, 2500)}`,
      MATCH_TOOL,
      { model: MODEL_SMART },
    );

    // Fraud score (Haiku) — best-effort, never fails the job.
    let fraudScore = 0;
    try {
      if (profileText.trim().length > 30) {
        const fraud = await structured<{ score: number; flags: string[] }>(
          'You detect misrepresentation/fraud risk in UAE job applications (fake experience, copied content, inconsistent claims). Call fraud_check.',
          profileText.slice(0, 3000),
          FRAUD_TOOL as never,
          { model: MODEL_FAST, maxTokens: 400 },
        );
        fraudScore = Math.max(0, Math.min(100, fraud.score));
      }
    } catch (err) {
      console.error('[ai-scoring] fraud check failed:', err instanceof Error ? err.message : err);
    }

    await db.update(applications).set({ matchScore: match.score, aiSummary: match.summary, fraudScore }).where(eq(applications.id, app.id));
  },
  { connection, concurrency: 2 },
).on('failed', (job, err) => console.error(`[ai-scoring] ${job?.id} failed:`, err.message));

// ── Maintenance worker (cv-cleanup + trending-skills) ────
const TRENDING_TOOL = {
  name: 'trending',
  description: 'Extract the top in-demand skills from UAE job listings.',
  input_schema: {
    type: 'object' as const,
    properties: { skills: { type: 'array', items: { type: 'string' }, description: 'Up to 8 skills, most in-demand first' } },
    required: ['skills'],
  },
};

new Worker<MaintenanceJob>(
  QUEUE.maintenance,
  async (job) => {
    if (job.data.task === 'cv-cleanup') {
      const cutoff = new Date(Date.now() - 90 * 86_400_000);
      const stale = await db.query.applications.findMany({
        where: and(inArray(applications.status, ['rejected', 'withdrawn']), lt(applications.updatedAt, cutoff), isNotNull(applications.resumeUrl)),
        columns: { id: true, resumeUrl: true },
        limit: 500,
      });
      for (const a of stale) {
        if (a.resumeUrl) {
          try { await deleteObjectByUrl(a.resumeUrl); } catch (err) { console.error('[cv-cleanup] delete failed:', err instanceof Error ? err.message : err); }
        }
        await db.update(applications).set({ resumeUrl: null }).where(eq(applications.id, a.id));
      }
      console.log(`[cv-cleanup] cleared ${stale.length} expired CV(s)`);
      return;
    }

    if (job.data.task === 'trending-skills') {
      const result: Record<string, string[]> = {};
      for (const cat of CATEGORIES) {
        const rows = await db.query.jobs.findMany({
          where: and(eq(jobs.status, 'active'), eq(jobs.categorySlug, cat.slug)),
          columns: { title: true, skills: true },
          orderBy: [desc(jobs.publishedAt)],
          limit: 30,
        });
        if (!rows.length) continue;
        const text = rows.map((r) => `${r.title}: ${(r.skills ?? []).join(', ')}`).join('\n').slice(0, 4000);
        try {
          const out = await structured<{ skills: string[] }>(
            'You analyse UAE job listings. Extract the most in-demand skills. Call trending.',
            text,
            TRENDING_TOOL as never,
            { model: MODEL_FAST, maxTokens: 300 },
          );
          result[cat.slug] = (out.skills ?? []).slice(0, 8);
        } catch (err) {
          console.error('[trending-skills] failed for', cat.slug, err instanceof Error ? err.message : err);
        }
      }
      await db
        .insert(siteSettings)
        .values({ key: 'trending_skills', value: result })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: result } });
      console.log(`[trending-skills] updated ${Object.keys(result).length} categories`);
    }
  },
  { connection, concurrency: 1 },
).on('failed', (job, err) => console.error(`[maintenance] ${job?.id} failed:`, err.message));

// ── Job-events worker (proactive-match + bias-scan) ──────
const BIAS_TOOL = {
  name: 'bias',
  description: 'Flag biased or discriminatory language in a UAE job description.',
  input_schema: {
    type: 'object' as const,
    properties: {
      score: { type: 'integer', description: '0 (inclusive) - 100 (heavily biased)' },
      flags: { type: 'array', items: { type: 'string' } },
    },
    required: ['score', 'flags'],
  },
};

new Worker<JobEventJob>(
  QUEUE.jobEvents,
  async (job) => {
    const j = await db.query.jobs.findFirst({ where: eq(jobs.id, job.data.jobId) });
    if (!j) return;

    if (job.data.event === 'approved') {
      if (j.status !== 'active') return;
      const seekers = await db.query.jobseekerProfiles.findMany({
        where: eq(jobseekerProfiles.categorySlug, j.categorySlug),
        columns: { userId: true },
        limit: 200,
      });
      if (seekers.length) {
        await db.insert(notifications).values(
          seekers.map((s) => ({
            userId: s.userId,
            type: 'job-match',
            title: `New role: ${j.title}`,
            body: 'A new job matching your field was just posted.',
            link: `/jobs/${j.slug}`,
          })),
        );
      }
      console.log(`[proactive-match] notified ${seekers.length} seeker(s) for job ${j.id}`);

      // WhatsApp outbound alerts: matching active WA alerts, max 3 WA/user/day.
      try {
        const waAlerts = await db.query.jobAlerts.findMany({
          where: and(eq(jobAlerts.isActive, true), eq(jobAlerts.channel, 'whatsapp'), isNotNull(jobAlerts.whatsappNumber)),
          limit: 500,
        });
        const redis = getRedis();
        const day = new Date().toISOString().slice(0, 10);
        const seenNumbers = new Set<string>();
        for (const a of waAlerts) {
          // Match: each set filter must agree with the job.
          if (a.categorySlug && a.categorySlug !== j.categorySlug) continue;
          if (a.emirateSlug && a.emirateSlug !== j.emirateSlug) continue;
          if (a.jobType && a.jobType !== j.jobType) continue;
          if (a.keywords) {
            const kw = a.keywords.toLowerCase();
            if (!(`${j.title} ${j.description}`.toLowerCase().includes(kw))) continue;
          }
          const num = (a.whatsappNumber ?? '').replace(/\D/g, '');
          if (!num || seenNumbers.has(num)) continue;
          seenNumbers.add(num);
          // Daily cap: 3 WA alerts per user per day.
          const capKey = `waalert:${a.userId}:${day}`;
          const n = await redis.incr(capKey);
          if (n === 1) await redis.expire(capKey, 86_400);
          if (n > 3) continue;
          await sendWhapiText(
            num,
            `🆕 New job: ${j.title}\n${j.location ?? j.emirateSlug}\nApply: ${APP_URL}/jobs/${j.slug}\n\nReply STOP to unsubscribe from WhatsApp alerts.`,
          ).catch(() => {});
        }
      } catch (err) {
        console.error('[wa-alerts] failed:', err instanceof Error ? err.message : err);
      }
      return;
    }

    // submitted → bias scan
    const bias = await structured<{ score: number; flags: string[] }>(
      'You audit UAE job descriptions for biased, discriminatory or non-inclusive language. Call bias.',
      j.description.slice(0, 4000),
      BIAS_TOOL as never,
      { model: MODEL_FAST, maxTokens: 400 },
    ).catch(() => null);
    if (bias && bias.score > 50) {
      const admins = await db.query.users.findMany({ where: eq(users.role, 'admin'), columns: { id: true }, limit: 20 });
      if (admins.length) {
        await db.insert(notifications).values(
          admins.map((a) => ({
            userId: a.id,
            type: 'bias-flag',
            title: `Possible biased language: "${j.title}"`,
            body: bias.flags.slice(0, 2).join('; ') || 'Review recommended.',
            link: `/admin/jobs/${j.id}/edit`,
          })),
        );
      }
      console.log(`[bias-scan] flagged job ${j.id} (score ${bias.score})`);
    }
  },
  { connection, concurrency: 2 },
).on('failed', (job, err) => console.error(`[job-events] ${job?.id} failed:`, err.message));

// ── Whapi import worker (AI extraction, rate-limited 5/min) ──
// Webhook enqueues here and returns 200 instantly; the limiter serialises AI
// calls so providers never see a 429 burst.
new Worker<WhapiImportJob>(
  QUEUE.whapiImport,
  async (job) => {
    const { text, source, sourceMetadata, autoPublish, reply } = job.data;
    const saved = await extractAndSaveDraft(text, source, sourceMetadata, { autoPublish });
    if (saved && reply?.onSuccess && reply.to) {
      const link = 'https://ddotsmediajobs.com/admin/jobs/drafts';
      const msg = (reply.successMessage ?? '✅ Job created: [title]').replace('[title]', saved.title).replace('[link]', link);
      await sendWhapiText(reply.to, msg);
    }
  },
  { connection, concurrency: 1, limiter: { max: 5, duration: 60_000 } },
).on('failed', (job, err) => console.error(`[whapi-import] ${job?.id} failed:`, err.message));

// ── Auto-expire stale jobs (in-process hourly tick) ──────
async function expireTick() {
  try {
    const n = await expireStaleJobs();
    if (n > 0) console.log(`[expire] expired ${n} stale job(s)`);
  } catch (err) {
    console.error('[expire] tick failed:', err);
  }
}
void expireTick(); // run once on startup
setInterval(() => void expireTick(), 60 * 60 * 1000); // hourly

// ── Uptime monitor: ping /api/health every 5 min ─────────
// Tracks rolling uptime % in site_settings; emails admins after 3 consecutive
// failures (once per outage). Fail-open: never throws out of the tick.
type UptimeState = { checks: number; ups: number; consecutiveFails: number; alerted: boolean; lastStatus: 'up' | 'down' | 'unknown'; lastCheckAt: string };
const UPTIME_KEY = 'uptime_monitor';

async function uptimeTick() {
  try {
    let up = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(`${APP_URL}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      up = res.ok;
    } catch {
      up = false;
    }

    const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.key, UPTIME_KEY) });
    const prev = (row?.value as UptimeState | undefined) ?? { checks: 0, ups: 0, consecutiveFails: 0, alerted: false, lastStatus: 'unknown' as const, lastCheckAt: new Date().toISOString() };

    const next: UptimeState = {
      checks: prev.checks + 1,
      ups: prev.ups + (up ? 1 : 0),
      consecutiveFails: up ? 0 : prev.consecutiveFails + 1,
      alerted: up ? false : prev.alerted,
      lastStatus: up ? 'up' : 'down',
      lastCheckAt: new Date().toISOString(),
    };

    // 3 consecutive failures → alert admins once per outage.
    if (!up && next.consecutiveFails >= 3 && !prev.alerted) {
      const admins = await db.query.users.findMany({ where: eq(users.role, 'admin'), columns: { email: true } });
      const to = admins.map((a) => a.email).filter((e): e is string => !!e);
      if (to.length) {
        const sent = await sendAlertEmail(
          to,
          '🔴 DdotsMediaJobs is DOWN',
          `Health check at ${APP_URL}/api/health failed ${next.consecutiveFails} times in a row (last check ${next.lastCheckAt}). Please investigate.`,
        );
        if (sent) next.alerted = true;
      }
    }

    await db
      .insert(siteSettings)
      .values({ key: UPTIME_KEY, value: next })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: next } });
  } catch (err) {
    console.error('[uptime] tick failed:', err instanceof Error ? err.message : err);
  }
}
setTimeout(() => void uptimeTick(), 30_000); // first check 30s after boot
setInterval(() => void uptimeTick(), 5 * 60 * 1000); // every 5 min

// ── Schedule repeatable alert scans ──────────────────────
async function scheduleAlertScans() {
  const q = jobAlertsQueue();
  // Daily at 08:00, weekly Mon 08:00 (server timezone).
  await q.add('daily', { frequency: 'daily' }, { repeat: { pattern: '0 8 * * *' }, jobId: 'alerts-daily' });
  await q.add('weekly', { frequency: 'weekly' }, { repeat: { pattern: '0 8 * * 1' }, jobId: 'alerts-weekly' });

  const m = maintenanceQueue();
  await m.add('cv-cleanup', { task: 'cv-cleanup' }, { repeat: { pattern: '0 3 * * *' }, jobId: 'cv-cleanup-daily' });
  await m.add('trending-skills', { task: 'trending-skills' }, { repeat: { pattern: '0 6 * * 1' }, jobId: 'trending-weekly' });
}

scheduleAlertScans()
  .then(() => console.log('✅ Worker started: email, search-sync, job-alerts queues active.'))
  .catch((err) => console.error('Failed to schedule alert scans:', err));
