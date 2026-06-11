import { Queue, type JobsOptions, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

let connection: IORedis | null = null;

/** Shared Redis connection for BullMQ (queues + workers). */
export function getRedis(): IORedis {
  if (connection) return connection;
  connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
  // Without an 'error' listener, ioredis emits an unhandled error (AggregateError)
  // that can crash the process. Log and let retryStrategy reconnect.
  connection.on('error', (err) => console.error('[redis] error:', err instanceof Error ? err.message : err));
  return connection;
}

/** BullMQ connection option backed by the shared ioredis instance. */
export function bullConnection(): ConnectionOptions {
  return getRedis() as unknown as ConnectionOptions;
}

// ─── Queue names + payloads ──────────────────────────────
export const QUEUE = {
  email: 'email',
  jobAlerts: 'job-alerts',
  search: 'search-sync',
  aiScoring: 'ai-scoring',
  maintenance: 'maintenance',
  jobEvents: 'job-events',
} as const;

export type AiScoringJob = { applicationId: string };
export type MaintenanceJob = { task: 'cv-cleanup' | 'trending-skills' };
export type JobEventJob = { jobId: string; event: 'approved' | 'submitted' };

export type EmailJob =
  | { type: 'welcome'; to: string; name: string; role: 'jobseeker' | 'employer' }
  | { type: 'apply-confirmation'; to: string; name: string; jobTitle: string; companyName: string }
  | { type: 'job-approved'; to: string; name: string; jobTitle: string; jobUrl: string }
  | { type: 'password-reset'; to: string; name: string; resetUrl: string }
  | { type: 'verify-email'; to: string; name: string; verifyUrl: string }
  | {
      type: 'job-alert';
      to: string;
      name: string;
      jobs: { title: string; companyName: string; location: string; salary: string; url: string }[];
    };

export type SearchSyncJob =
  | { type: 'upsert'; jobId: string }
  | { type: 'delete'; jobId: string };

export type AlertScanJob = { frequency: 'daily' | 'weekly' };

const queues = new Map<string, Queue>();

function makeQueue<T>(name: string): Queue<T> {
  const existing = queues.get(name);
  if (existing) return existing as unknown as Queue<T>;
  const q = new Queue<T>(name, { connection: bullConnection() });
  queues.set(name, q as unknown as Queue);
  return q;
}

export const emailQueue = () => makeQueue<EmailJob>(QUEUE.email);
export const searchQueue = () => makeQueue<SearchSyncJob>(QUEUE.search);
export const jobAlertsQueue = () => makeQueue<AlertScanJob>(QUEUE.jobAlerts);
export const aiScoringQueue = () => makeQueue<AiScoringJob>(QUEUE.aiScoring);
export const maintenanceQueue = () => makeQueue<MaintenanceJob>(QUEUE.maintenance);
export const jobEventsQueue = () => makeQueue<JobEventJob>(QUEUE.jobEvents);

const defaultOpts: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export async function enqueueEmail(job: EmailJob): Promise<void> {
  await emailQueue().add(job.type, job, defaultOpts);
}

export async function enqueueSearchSync(job: SearchSyncJob): Promise<void> {
  await searchQueue().add(job.type, job, defaultOpts);
}

export async function enqueueAiScoring(job: AiScoringJob): Promise<void> {
  await aiScoringQueue().add('score', job, { ...defaultOpts, attempts: 2 });
}

export async function enqueueJobEvent(job: JobEventJob): Promise<void> {
  await jobEventsQueue().add(job.event, job, { ...defaultOpts, attempts: 2 });
}
