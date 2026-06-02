import { Resend } from 'resend';
import { render } from '@react-email/render';
import {
  WelcomeEmail,
  ApplyConfirmationEmail,
  JobApprovedEmail,
  JobAlertEmail,
} from '@ddots/email';
import type { EmailJob } from './queue';

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
  }
}

export async function sendEmailJob(job: EmailJob): Promise<void> {
  const { subject, html } = await renderEmail(job);
  await getResend().emails.send({ from: FROM, to: job.to, subject, html });
}
