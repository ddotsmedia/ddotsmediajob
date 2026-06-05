import { db, jobs, users, companies, whatsappBotLogs, eq } from '@ddots/db';
import { slugify, CATEGORY_SLUGS, EMIRATE_SLUGS, JOB_TYPES } from '@ddots/shared';
import { enqueueSearchSync } from '../queue';
import type { ParsedJob } from './parser';

// Map parser category labels onto real site category slugs (with safe fallback).
const CATEGORY_ALIASES: Record<string, string> = {
  teaching: 'education',
  hr: 'admin',
  legal: 'admin',
  marketing: 'sales',
  engineering: 'manufacturing',
  fresher: 'admin',
  remote: 'admin',
  parttime: 'admin',
  freelance: 'admin',
};

function resolveCategory(c: string | null): string {
  if (c && (CATEGORY_SLUGS as readonly string[]).includes(c)) return c;
  if (c && CATEGORY_ALIASES[c]) return CATEGORY_ALIASES[c];
  return 'admin';
}
function resolveEmirate(e: string | null): string {
  return e && (EMIRATE_SLUGS as readonly string[]).includes(e) ? e : 'dubai';
}
function resolveJobType(t: string | null): string {
  return t && (JOB_TYPES as readonly string[]).includes(t) ? t : 'full-time';
}

async function findOrCreateCompany(name: string | null): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const slug = slugify(name);
  const existing = await db.query.companies.findFirst({ where: eq(companies.slug, slug) });
  if (existing) return existing.id;
  const [co] = await db.insert(companies).values({ slug, name: name.trim(), industry: 'General' }).returning();
  return co?.id ?? null;
}

/** Create an auto-approved job from a parsed WhatsApp message. Returns the new job's id + slug. */
export async function createJobFromWhatsApp(
  draft: ParsedJob,
  postedByPhone: string,
  source: 'whatsapp_bot' | 'quick_post' | 'admin_web' = 'whatsapp_bot',
): Promise<{ id: string; slug: string }> {
  const admin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
  if (!admin) throw new Error('No admin account configured');

  const companyId = await findOrCreateCompany(draft.company);
  const slug = `${slugify(draft.title) || 'job'}-${Math.random().toString(36).slice(2, 7)}`;

  const [job] = await db
    .insert(jobs)
    .values({
      slug,
      employerId: admin.id,
      companyId,
      title: draft.title,
      description: draft.description?.trim() || 'Contact employer for details.',
      categorySlug: resolveCategory(draft.category),
      emirateSlug: resolveEmirate(draft.emirate),
      jobType: resolveJobType(draft.job_type) as never,
      experienceLevel: '1-3-years' as never,
      salaryMin: draft.salary_min ?? null,
      salaryMax: draft.salary_max ?? null,
      salaryHidden: draft.salary_min == null && draft.salary_max == null,
      visaProvided: !!draft.visa_provided,
      accommodationProvided: !!draft.accommodation,
      isUrgent: draft.urgent,
      contactWhatsapp: draft.contact_whatsapp ?? null,
      applyEmail: draft.contact_email ?? null,
      status: 'active',
      source,
      aiGenerated: true,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    })
    .returning();

  await db.insert(whatsappBotLogs).values({
    phone: postedByPhone,
    direction: 'out',
    message: `Posted job: ${draft.title}`,
    parsedData: draft as unknown as Record<string, unknown>,
    jobId: job!.id,
  });

  await enqueueSearchSync({ type: 'upsert', jobId: job!.id }).catch(() => {});
  return { id: job!.id, slug: job!.slug };
}
