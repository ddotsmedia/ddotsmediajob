import { z } from 'zod';
import {
  JOB_TYPES,
  VISA_STATUS,
  EXPERIENCE_LEVELS,
  SALARY_PERIODS,
  CATEGORY_SLUGS,
  EMIRATE_SLUGS,
  APPLICATION_STATUS,
  ALERT_FREQUENCY,
} from './constants';

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);

// ─── Auth ────────────────────────────────────────────────
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(100)
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Include at least one symbol');

export const registerSchema = z.object({
  name: nonEmpty(120),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  role: z.enum(['jobseeker', 'employer']),
  ref: z.string().trim().max(20).optional(), // referral code
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Jobs ────────────────────────────────────────────────
export const jobFieldsSchema = z.object({
  title: nonEmpty(160),
  description: z.string().trim().min(30).max(20000),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  emirateSlug: z.enum(EMIRATE_SLUGS as [string, ...string[]]),
  location: z.string().trim().max(160).optional(),
  jobType: z.enum(JOB_TYPES),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  visaStatus: z.enum(VISA_STATUS).default('any'),
  salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(),
  salaryPeriod: z.enum(SALARY_PERIODS).default('monthly'),
  salaryHidden: z.boolean().default(false),
  isRemote: z.boolean().default(false),
  isUrgent: z.boolean().default(false),
  isFresher: z.boolean().default(false),
  freeZone: z.boolean().default(false),
  freeZoneName: z.string().trim().max(40).optional(),
  isAnonymous: z.boolean().default(false),
  visaProvided: z.boolean().default(false),
  accommodationProvided: z.boolean().default(false),
  skills: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  benefits: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  applyEmail: z.string().trim().toLowerCase().email().optional(),
  applyUrl: z.string().trim().url().optional(),
  expiresAt: z.coerce.date().optional(),
});

// Community referral post — simplified form for jobseekers/users sharing a job they know of.
export const communityPostSchema = z.object({
  title: nonEmpty(160),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  emirateSlug: z.enum(EMIRATE_SLUGS as [string, ...string[]]),
  description: z.string().trim().min(30).max(8000),
  salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(),
  contactWhatsapp: z.string().trim().max(30).optional(),
  contactEmail: z.string().trim().toLowerCase().email().optional(),
  relation: z.enum(['work_there', 'friend_referred', 'other']),
  isAnonymous: z.boolean().default(false),
}).refine((d) => d.salaryMin == null || d.salaryMax == null || d.salaryMax >= d.salaryMin, {
  message: 'Maximum salary must be greater than or equal to minimum',
  path: ['salaryMax'],
});
export type CommunityPostInput = z.infer<typeof communityPostSchema>;

export const jobInputSchema = jobFieldsSchema.refine(
  (d) => d.salaryMin == null || d.salaryMax == null || d.salaryMax >= d.salaryMin,
  {
    message: 'Maximum salary must be greater than or equal to minimum',
    path: ['salaryMax'],
  },
);
export type JobInput = z.infer<typeof jobInputSchema>;

// ─── AI quick post ───────────────────────────────────────
export const aiQuickPostSchema = z.object({
  prompt: z.string().trim().min(10, 'Describe the role in a sentence or two').max(2000),
});

// ─── Job search / filters ────────────────────────────────
export const jobFilterSchema = z.object({
  q: z.string().trim().max(160).optional(),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
  emirate: z.enum(EMIRATE_SLUGS as [string, ...string[]]).optional(),
  jobType: z.enum(JOB_TYPES).optional(),
  visaStatus: z.enum(VISA_STATUS).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  isRemote: z.coerce.boolean().optional(),
  isFresher: z.coerce.boolean().optional(),
  isUrgent: z.coerce.boolean().optional(),
  freeZone: z.coerce.boolean().optional(),
  visaProvided: z.coerce.boolean().optional(),
  sort: z.enum(['relevance', 'newest', 'salary']).default('newest'),
  postedWithin: z.enum(['any', 'today', '3days', 'week', 'month']).default('any'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
});
export type JobFilter = z.infer<typeof jobFilterSchema>;

// ─── Applications ────────────────────────────────────────
export const applySchema = z.object({
  jobId: z.string().uuid(),
  coverLetter: z.string().trim().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
  phone: z.string().trim().max(30).optional(),
});
export type ApplyInput = z.infer<typeof applySchema>;

export const updateApplicationStatusSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(APPLICATION_STATUS),
  note: z.string().trim().max(2000).optional(),
});

// ─── Job alerts ──────────────────────────────────────────
export const jobAlertSchema = z
  .object({
    keywords: z.string().trim().max(160).optional(),
    categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
    emirateSlug: z.enum(EMIRATE_SLUGS as [string, ...string[]]).optional(),
    jobType: z.enum(JOB_TYPES).optional(),
    frequency: z.enum(ALERT_FREQUENCY).default('daily'),
    channel: z.enum(['email', 'whatsapp']).default('email'),
    whatsappNumber: z.string().trim().max(30).optional(),
  })
  .refine((d) => d.channel !== 'whatsapp' || (d.whatsappNumber && d.whatsappNumber.length >= 7), {
    message: 'A WhatsApp number is required for WhatsApp alerts',
    path: ['whatsappNumber'],
  });
export type JobAlertInput = z.infer<typeof jobAlertSchema>;

// ─── Profiles ────────────────────────────────────────────
export const jobseekerProfileSchema = z.object({
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(4000).optional(),
  phone: z.string().trim().max(30).optional(),
  emirateSlug: z.enum(EMIRATE_SLUGS as [string, ...string[]]).optional(),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  visaStatus: z.enum(VISA_STATUS).optional(),
  skills: z.array(z.string().trim().min(1).max(50)).max(50).default([]),
  resumeUrl: z.string().url().optional(),
  openToWork: z.boolean().default(true),
});
export type JobseekerProfileInput = z.infer<typeof jobseekerProfileSchema>;

export const employerProfileSchema = z.object({
  companyName: nonEmpty(160),
  website: z.string().trim().url().optional(),
  about: z.string().trim().max(6000).optional(),
  industry: z.string().trim().max(120).optional(),
  emirateSlug: z.enum(EMIRATE_SLUGS as [string, ...string[]]).optional(),
  logoUrl: z.string().url().optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500-1000', '1000-plus']).optional(),
  // Enhanced company-page fields (Phase 6)
  officePhotos: z.array(z.string().url()).max(6).optional(),
  cultureVideo: z.string().trim().max(500).optional(),
  ceoMessage: z.string().trim().max(3000).optional(),
  ceoName: z.string().trim().max(120).optional(),
  ceoPhoto: z.string().url().optional(),
  cultureDescription: z.string().trim().max(3000).optional(),
  benefits: z.array(z.string().trim().max(80)).max(20).optional(),
  workingHours: z.string().trim().max(120).optional(),
  teamSize: z.string().trim().max(60).optional(),
  founded: z.string().trim().max(20).optional(),
  companyType: z.string().trim().max(40).optional(),
  linkedin: z.string().trim().max(300).optional(),
  instagram: z.string().trim().max(300).optional(),
  glassdoorUrl: z.string().trim().max(300).optional(),
  tourImageUrl: z.string().url().optional(),
});
export type EmployerProfileInput = z.infer<typeof employerProfileSchema>;
