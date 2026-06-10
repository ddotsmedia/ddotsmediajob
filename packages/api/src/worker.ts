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
  users,
  eq,
  and,
  gt,
  desc,
  ilike,
  or,
} from '@ddots/db';
import { formatSalary } from '@ddots/shared';
import { QUEUE, bullConnection, enqueueEmail, jobAlertsQueue, type EmailJob, type SearchSyncJob, type AlertScanJob, type AiScoringJob } from './lib/queue';
import { expireStaleJobs } from './lib/helpers';
import { sendEmailJob } from './lib/email';
import { ensureJobsCollection, upsertJobDocument, deleteJobDocument, jobToDocument } from './lib/typesense';
import { structured, MATCH_TOOL, MODEL_SMART, MODEL_FAST, type MatchResult } from './lib/anthropic';

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
    if (job.data.type === 'delete') {
      await deleteJobDocument(job.data.jobId);
      return;
    }
    const row = await db.query.jobs.findFirst({
      where: eq(jobs.id, job.data.jobId),
      with: { company: { columns: { name: true } } },
    });
    if (!row || row.status !== 'active') {
      await deleteJobDocument(job.data.jobId);
      return;
    }
    await upsertJobDocument(jobToDocument(row, row.company?.name));
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

      if (matches.length && alert.user?.email) {
        await enqueueEmail({
          type: 'job-alert',
          to: alert.user.email,
          name: alert.user.name ?? 'there',
          jobs: matches.map((m) => ({
            title: m.title,
            companyName: m.company?.name ?? 'Employer',
            location: m.location ?? m.emirateSlug,
            salary: formatSalary(m.salaryMin, m.salaryMax, m.salaryPeriod, m.salaryHidden),
            url: `${APP_URL}/jobs/${m.slug}`,
          })),
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

// ── Schedule repeatable alert scans ──────────────────────
async function scheduleAlertScans() {
  const q = jobAlertsQueue();
  // Daily at 08:00, weekly Mon 08:00 (server timezone).
  await q.add('daily', { frequency: 'daily' }, { repeat: { pattern: '0 8 * * *' }, jobId: 'alerts-daily' });
  await q.add('weekly', { frequency: 'weekly' }, { repeat: { pattern: '0 8 * * 1' }, jobId: 'alerts-weekly' });
}

scheduleAlertScans()
  .then(() => console.log('✅ Worker started: email, search-sync, job-alerts queues active.'))
  .catch((err) => console.error('Failed to schedule alert scans:', err));
