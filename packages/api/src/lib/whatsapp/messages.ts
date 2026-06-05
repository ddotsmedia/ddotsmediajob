import { SITE } from '@ddots/shared';
import type { ParsedJob } from './parser';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? SITE.url;

export const HELP_MESSAGE = `👋 *DdotsMediaJobs Bot*

Send a job in any format and I'll post it to the site instantly!

*Example:*
Sales Executive, ABC Trading, Dubai, 5000-7000 AED, visa provided, contact 0501234567

*Commands:*
📋 *status* — see your recent posts
📊 *list* — total jobs on site
❌ *cancel* — cancel current action
❓ *help* — show this menu

Just send the job details and I'll handle the rest! 🚀`;

export const ERROR_MESSAGE = `⚠️ Something went wrong posting your job.
Please try again or contact support.`;

export const UNAUTHORIZED_MESSAGE = `⛔ Unauthorized. Contact admin.`;

function salaryLine(j: ParsedJob): string {
  if (j.salary_min && j.salary_max) {
    return j.salary_min === j.salary_max ? `AED ${j.salary_min}/mo` : `AED ${j.salary_min}–${j.salary_max}/mo`;
  }
  return 'Not disclosed';
}

export function confirmationMessage(j: ParsedJob): string {
  const lines = [
    '📋 *Job Preview*',
    '',
    `🔹 *Title:* ${j.title}`,
    `🏢 *Company:* ${j.company || 'Confidential'}`,
    `📂 *Category:* ${j.category || 'Not set'}`,
    `📍 *Emirate:* ${j.emirate || 'Not set'}`,
    `💼 *Type:* ${j.job_type || 'Full-time'}`,
    `💰 *Salary:* ${salaryLine(j)}`,
    `✈️ *Visa:* ${j.visa_provided ? 'Provided ✅' : 'Not provided'}`,
    `🏠 *Accom:* ${j.accommodation ? 'Provided ✅' : 'Not provided'}`,
    `📞 *Contact:* ${j.contact_whatsapp || j.contact_email || 'Not set'}`,
    `🚨 *Urgent:* ${j.urgent ? 'Yes 🔴' : 'No'}`,
  ];
  if (j.description) lines.push('', `📝 *Description:* ${j.description.slice(0, 100)}${j.description.length > 100 ? '…' : ''}`);
  lines.push(
    '',
    'Reply *yes* to post, *no* to cancel, or correct any field:',
    '*title:* Sales Manager',
    '*emirate:* Dubai',
    '*salary:* 5000-8000',
    '*visa:* yes',
    '*contact:* 0501234567',
  );
  return lines.join('\n');
}

export function successMessage(j: ParsedJob, slug: string): string {
  const url = `${BASE}/jobs/${slug}`;
  const sal = salaryLine(j);
  const emirate = j.emirate || 'UAE';
  return `✅ *Job Posted Successfully!*

🔗 View live: ${url}

Share to your WhatsApp groups:
*${j.title} | ${emirate} | ${sal} | ${url}*

Send another job anytime! 📩`;
}
