/**
 * Domain constants for DdotsMediaJobs.
 * Single source of truth shared across db, api, and web.
 */

export const SITE = {
  name: 'DdotsMediaJobs',
  domain: 'ddotsmediajobs.com',
  url: 'https://ddotsmediajobs.com',
  tagline: 'Find Your Next Job in the UAE',
  description:
    'DdotsMediaJobs is the UAE job portal connecting jobseekers with verified employers across Dubai, Abu Dhabi, Sharjah and all emirates.',
  email: 'jobs@ddotsmediajobs.com',
} as const;

// Palette sampled from the DDOTS Media logo (teal field + four warm dots).
export const BRAND = {
  teal: '#339a9b', // primary
  deepTeal: '#0d2e2d', // dark sections (hero / footer)
  orange: '#ea7a3c', // warm accent / CTA / urgent
  gold: '#f4cf3f', // yellow dots
  lime: '#b3cb4f', // lime dot
} as const;

// ─── Emirates ────────────────────────────────────────────
export const EMIRATES = [
  { slug: 'dubai', name: 'Dubai', ar: 'دبي', lat: 25.2048, lng: 55.2708 },
  { slug: 'abu-dhabi', name: 'Abu Dhabi', ar: 'أبو ظبي', lat: 24.4539, lng: 54.3773 },
  { slug: 'sharjah', name: 'Sharjah', ar: 'الشارقة', lat: 25.3463, lng: 55.4209 },
  { slug: 'ajman', name: 'Ajman', ar: 'عجمان', lat: 25.4052, lng: 55.5136 },
  { slug: 'ras-al-khaimah', name: 'Ras Al Khaimah', ar: 'رأس الخيمة', lat: 25.8007, lng: 55.9762 },
  { slug: 'fujairah', name: 'Fujairah', ar: 'الفجيرة', lat: 25.1288, lng: 56.3265 },
  { slug: 'umm-al-quwain', name: 'Umm Al Quwain', ar: 'أم القيوين', lat: 25.5647, lng: 55.5534 },
] as const;

export type EmirateSlug = (typeof EMIRATES)[number]['slug'];
export const EMIRATE_SLUGS = EMIRATES.map((e) => e.slug);

// ─── Categories (12) ─────────────────────────────────────
export const CATEGORIES = [
  { slug: 'it', name: 'IT & Software', icon: 'Laptop', description: 'Software, networking, data, cloud and tech support roles across the UAE.' },
  { slug: 'healthcare', name: 'Healthcare', icon: 'Stethoscope', description: 'Doctors, nurses, pharmacists and allied health professionals.' },
  { slug: 'finance', name: 'Finance & Accounting', icon: 'Landmark', description: 'Accounting, audit, banking, tax and financial analysis jobs.' },
  { slug: 'sales', name: 'Sales & Marketing', icon: 'TrendingUp', description: 'Sales executives, marketing, business development and retail.' },
  { slug: 'construction', name: 'Construction', icon: 'HardHat', description: 'Civil, MEP, site engineers, foremen and skilled trades.' },
  { slug: 'hospitality', name: 'Hospitality & Tourism', icon: 'ConciergeBell', description: 'Hotels, F&B, travel, events and guest services.' },
  { slug: 'driving', name: 'Driving & Logistics', icon: 'Truck', description: 'Drivers, delivery, warehouse and supply chain roles.' },
  { slug: 'education', name: 'Education', icon: 'GraduationCap', description: 'Teachers, trainers, academic and administration staff.' },
  { slug: 'admin', name: 'Admin & Office', icon: 'Briefcase', description: 'Receptionists, secretaries, coordinators and office support.' },
  { slug: 'manufacturing', name: 'Manufacturing', icon: 'Factory', description: 'Production, quality, maintenance and plant operations.' },
  { slug: 'security', name: 'Security', icon: 'ShieldCheck', description: 'Security guards, supervisors and safety officers.' },
  { slug: 'beauty', name: 'Beauty & Wellness', icon: 'Sparkles', description: 'Salon, spa, fitness and personal care professionals.' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

// ─── Job enums ───────────────────────────────────────────
export const JOB_TYPES = ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'freelance'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const VISA_STATUS = ['any', 'visit-visa', 'cancelled-visa', 'employment-visa', 'golden-visa', 'sponsored'] as const;
export type VisaStatus = (typeof VISA_STATUS)[number];

// Where a job accepts applicants from.
export const APPLICANT_LOCATIONS = ['in_uae', 'outside_uae', 'both'] as const;
export type ApplicantLocation = (typeof APPLICANT_LOCATIONS)[number];
export const APPLICANT_LOCATION_LABEL: Record<ApplicantLocation, string> = {
  in_uae: 'In UAE only',
  outside_uae: 'Outside UAE welcome',
  both: 'Open to all',
};

export const EXPERIENCE_LEVELS = ['fresher', 'junior', '1-3-years', '3-5-years', '5-10-years', '10-plus-years'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** Human-readable experience labels (raw slugs like "1-3-years" otherwise render as "1 3 years"). */
export const EXPERIENCE_LABELS: Record<string, string> = {
  fresher: 'No experience required',
  junior: 'Less than 1 year',
  '1-3-years': '1-3 years',
  '3-5-years': '3-5 years',
  '5-10-years': '5-10 years',
  '10-plus-years': '10+ years',
  '1': '1 year',
  '2': '2 years',
  '3': '3 years',
  '13': 'Not specified',
};
/** Canonical experience-label formatter. Use everywhere a raw slug would otherwise render (e.g. "1-3-years" → "1 3 years"). */
export function formatExperience(val: string | null | undefined): string {
  if (!val) return 'Not specified';
  return EXPERIENCE_LABELS[val] ?? val.replace(/-/g, ' ');
}
/** @deprecated alias kept for existing imports — use {@link formatExperience}. */
export const expLabel = formatExperience;

/**
 * Infer an experience level from free job text. Returns null when nothing matches
 * (caller should leave the field empty). Ranges are checked most-specific first.
 */
export function inferExperienceLevel(text: string | null | undefined): ExperienceLevel | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\bfresher\b|no experience|fresh graduate|freshers?\s*welcome/.test(t)) return 'fresher';
  if (/less than 1 ?year|under 1 ?year|0\s*-\s*1\s*year|0 to 1 ?year/.test(t)) return 'junior';
  if (/10\s*\+|10 ?years? and (above|over)|more than 10 ?years?|over 10 ?years?|10\s*years?\s*\+/.test(t)) return '10-plus-years';
  if (/5\s*-\s*10|5 to 10|5\s*\+\s*years?|5 ?years?\s*\+|more than 5 ?years?|minimum (of )?5|at least 5/.test(t)) return '5-10-years';
  if (/3\s*-\s*5|3 to 5|minimum (of )?3|at least 3/.test(t)) return '3-5-years';
  if (/1\s*-\s*3|1 to 3|minimum (of )?1|at least 1\b|\b1 ?year|\b2 ?years?\b/.test(t)) return '1-3-years';
  return null;
}

export const SALARY_PERIODS = ['monthly', 'yearly', 'hourly', 'daily'] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const JOB_STATUS = ['draft', 'pending', 'active', 'rejected', 'expired', 'closed', 'filled'] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

export const APPLICATION_STATUS = ['applied', 'quick_apply', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

export const USER_ROLES = ['jobseeker', 'employer', 'admin', 'volunteer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ALERT_FREQUENCY = ['daily', 'weekly', 'instant'] as const;
export type AlertFrequency = (typeof ALERT_FREQUENCY)[number];

// ─── Salary guide categories ─────────────────────────────
export const CURRENCY = 'AED';

// ─── UAE free zones ──────────────────────────────────────
export const FREE_ZONES = [
  { slug: 'dmcc', name: 'DMCC', emirate: 'dubai' },
  { slug: 'difc', name: 'DIFC', emirate: 'dubai' },
  { slug: 'jafza', name: 'JAFZA', emirate: 'dubai' },
  { slug: 'dafza', name: 'DAFZA', emirate: 'dubai' },
  { slug: 'dubai-internet-city', name: 'Dubai Internet City', emirate: 'dubai' },
  { slug: 'dubai-media-city', name: 'Dubai Media City', emirate: 'dubai' },
  { slug: 'adgm', name: 'ADGM', emirate: 'abu-dhabi' },
  { slug: 'kizad', name: 'KIZAD', emirate: 'abu-dhabi' },
  { slug: 'masdar-city', name: 'Masdar City', emirate: 'abu-dhabi' },
  { slug: 'shams', name: 'SHAMS', emirate: 'sharjah' },
  { slug: 'saif-zone', name: 'SAIF Zone', emirate: 'sharjah' },
  { slug: 'rakez', name: 'RAKEZ', emirate: 'ras-al-khaimah' },
  { slug: 'ajman-free-zone', name: 'Ajman Free Zone', emirate: 'ajman' },
  { slug: 'fujairah-free-zone', name: 'Fujairah Free Zone', emirate: 'fujairah' },
] as const;
export type FreeZoneSlug = (typeof FREE_ZONES)[number]['slug'];

// Golden / Blue visa salary thresholds (AED monthly), UAE 2026.
export const VISA_THRESHOLDS = {
  goldenSalary: 30000,
  blueSalary: 15000,
  nafisMinSalary: 6000,
} as const;

export function emirateBySlug(slug: string) {
  return EMIRATES.find((e) => e.slug === slug);
}
export function categoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

// User-submitted job/employer report reasons + moderation statuses (audit Phase 9).
export const REPORT_REASONS = [
  'requests_payment', 'fake_job', 'suspicious_contact', 'discrimination',
  'spam', 'duplicate', 'incorrect_info', 'expired_filled', 'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  requests_payment: 'Requests payment',
  fake_job: 'Fake or misleading job',
  suspicious_contact: 'Suspicious WhatsApp or email',
  discrimination: 'Discrimination',
  spam: 'Spam',
  duplicate: 'Duplicate job',
  incorrect_info: 'Incorrect information',
  expired_filled: 'Expired or filled',
  other: 'Other',
};

export const REPORT_STATUSES = ['open', 'under_review', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
