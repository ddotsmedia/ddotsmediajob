import { Resend } from 'resend';
import { render } from '@react-email/render';
import {
  WelcomeEmail,
  ApplyConfirmationEmail,
  JobApprovedEmail,
  JobAlertEmail,
  PasswordResetEmail,
  VerifyEmail,
} from '@ddots/email';
import type { EmailJob } from './queue';
import { isEmailConfigured } from './integrations';

let resend: Resend | null = null;
function getResend(): Resend {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set.');
  resend = new Resend(key);
  return resend;
}

const FROM = process.env.EMAIL_FROM ?? 'DdotsMediaJobs <jobs@ddotsmediajobs.com>';

/** Render an email job to subject + HTML. */
async function renderEmail(job: EmailJob): Promise<{ subject: string; html: string }> {
  switch (job.type) {
    case 'welcome':
      return {
        subject: 'Welcome to DdotsMediaJobs 🎉',
        html: await render(WelcomeEmail({ name: job.name, role: job.role })),
      };
    case 'apply-confirmation':
      return {
        subject: `Application sent: ${job.jobTitle}`,
        html: await render(
          ApplyConfirmationEmail({ name: job.name, jobTitle: job.jobTitle, companyName: job.companyName }),
        ),
      };
    case 'job-approved':
      return {
        subject: `Your job is live: ${job.jobTitle}`,
        html: await render(JobApprovedEmail({ name: job.name, jobTitle: job.jobTitle, jobUrl: job.jobUrl })),
      };
    case 'job-alert':
      return {
        subject: `${job.jobs.length} new jobs match your alert`,
        html: await render(JobAlertEmail({ name: job.name, jobs: job.jobs })),
      };
    case 'password-reset':
      return {
        subject: 'Reset your DdotsMediaJobs password',
        html: await render(PasswordResetEmail({ name: job.name, resetUrl: job.resetUrl })),
      };
    case 'verify-email':
      return {
        subject: 'Verify your email — DdotsMediaJobs',
        html: await render(VerifyEmail({ name: job.name, verifyUrl: job.verifyUrl })),
      };
  }
}

export async function sendEmailJob(job: EmailJob): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email skipped — RESEND_API_KEY not configured');
    return;
  }
  // Never throw on a send failure — email is best-effort and must not crash callers/workers.
  try {
    const { subject, html } = await renderEmail(job);
    await getResend().emails.send({ from: FROM, to: job.to, subject, html });
  } catch (err) {
    console.error('[email] send failed:', err instanceof Error ? err.message : err);
  }
}
