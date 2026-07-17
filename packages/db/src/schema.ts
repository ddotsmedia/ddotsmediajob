import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  JOB_TYPES,
  VISA_STATUS,
  EXPERIENCE_LEVELS,
  SALARY_PERIODS,
  JOB_STATUS,
  APPLICATION_STATUS,
  USER_ROLES,
  ALERT_FREQUENCY,
} from '@ddots/shared/constants';

// ─── Enums ───────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const jobTypeEnum = pgEnum('job_type', JOB_TYPES);
export const visaStatusEnum = pgEnum('visa_status', VISA_STATUS);
export const experienceLevelEnum = pgEnum('experience_level', EXPERIENCE_LEVELS);
export const salaryPeriodEnum = pgEnum('salary_period', SALARY_PERIODS);
export const jobStatusEnum = pgEnum('job_status', JOB_STATUS);
export const applicationStatusEnum = pgEnum('application_status', APPLICATION_STATUS);
export const alertFrequencyEnum = pgEnum('alert_frequency', ALERT_FREQUENCY);
export const companySizeEnum = pgEnum('company_size', ['1-10', '11-50', '51-200', '201-500', '500-1000', '1000-plus']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

// ─── Users (Auth.js core) ────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: timestamp('email_verified', { withTimezone: true }),
    image: text('image'),
    passwordHash: text('password_hash'),
    role: userRoleEnum('role').default('jobseeker').notNull(),
    isBanned: boolean('is_banned').default(false).notNull(),
    plan: varchar('plan', { length: 20 }).default('free').notNull(), // free | premium
    premiumUntil: timestamp('premium_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    // TOTP 2FA (opt-in; admins only enforced). Secret stored AES-256-GCM encrypted.
    totpSecret: text('totp_secret'),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    totpBackupCodes: jsonb('totp_backup_codes').$type<string[]>().default([]).notNull(),
    // Employer CV search: opt-in flag + AI-extracted resume metadata.
    cvSearchable: boolean('cv_searchable').default(false).notNull(),
    cvMetadata: jsonb('cv_metadata')
      .$type<{ skills?: string[]; experience?: number; location?: string[]; education?: string[] }>()
      .default({})
      .notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    index('idx_users_cv_searchable').on(t.cvSearchable).where(sql`${t.cvSearchable} = true`),
  ],
);

// Auth.js Drizzle adapter tables
export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 32 }).notNull(),
    provider: varchar('provider', { length: 64 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 32 }),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ─── Companies ───────────────────────────────────────────
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    logoUrl: text('logo_url'),
    coverUrl: text('cover_url'),
    website: text('website'),
    about: text('about'),
    industry: varchar('industry', { length: 120 }),
    emirateSlug: varchar('emirate_slug', { length: 40 }),
    size: companySizeEnum('size'),
    isVerified: boolean('is_verified').default(false).notNull(),
    ratingAvg: real('rating_avg').default(0).notNull(),
    ratingCount: integer('rating_count').default(0).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('companies_slug_idx').on(t.slug)],
);

// ─── Employer profiles ───────────────────────────────────
export const employerProfiles = pgTable('employer_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  companyName: varchar('company_name', { length: 160 }).notNull(),
  position: varchar('position', { length: 120 }),
  phone: varchar('phone', { length: 30 }),
  website: text('website'),
  about: text('about'),
  industry: varchar('industry', { length: 120 }),
  emirateSlug: varchar('emirate_slug', { length: 40 }),
  logoUrl: text('logo_url'),
  size: companySizeEnum('size'),
  isVerified: boolean('is_verified').default(false).notNull(),
  verificationStatus: varchar('verification_status', { length: 20 }).default('unverified').notNull(), // unverified | pending | verified | rejected
  verificationDocUrl: text('verification_doc_url'),
  verificationNote: text('verification_note'),
  tradeLicenseNo: varchar('trade_license_no', { length: 80 }),
  // ── Enhanced company-page fields (Phase 6) ──
  officePhotos: jsonb('office_photos').$type<string[]>().default([]).notNull(),
  cultureVideo: varchar('culture_video', { length: 500 }),
  ceoMessage: text('ceo_message'),
  ceoName: varchar('ceo_name', { length: 120 }),
  ceoPhoto: text('ceo_photo'),
  cultureDescription: text('culture_description'),
  benefits: jsonb('benefits').$type<string[]>().default([]).notNull(),
  workingHours: varchar('working_hours', { length: 120 }),
  teamSize: varchar('team_size', { length: 60 }),
  founded: varchar('founded', { length: 20 }),
  companyType: varchar('company_type', { length: 40 }), // LLC | Free Zone | Branch | Government
  linkedin: varchar('linkedin', { length: 300 }),
  instagram: varchar('instagram', { length: 300 }),
  glassdoorUrl: varchar('glassdoor_url', { length: 300 }),
  tourImageUrl: text('tour_image_url'), // Phase 15: 360° office tour
  cultureProfileAi: jsonb('culture_profile_ai').$type<Record<string, unknown>>(), // Phase 10 employer culture summary
  responseHours: integer('response_hours'), // avg hours to first respond to an application (null = unknown)
  ...timestamps,
});

// ─── Jobseeker profiles ──────────────────────────────────
export const jobseekerProfiles = pgTable('jobseeker_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 50 }).unique(), // public URL /talent/{username}
  headline: varchar('headline', { length: 160 }),
  bio: text('bio'),
  phone: varchar('phone', { length: 30 }),
  emirateSlug: varchar('emirate_slug', { length: 40 }),
  categorySlug: varchar('category_slug', { length: 40 }),
  experienceLevel: experienceLevelEnum('experience_level'),
  visaStatus: visaStatusEnum('visa_status'),
  nationality: varchar('nationality', { length: 100 }),
  languages: jsonb('languages').$type<string[]>().default([]).notNull(),
  skills: jsonb('skills').$type<string[]>().default([]).notNull(),
  resumeUrl: text('resume_url'),
  resumeFilename: varchar('resume_filename', { length: 255 }),
  resumeUploadedAt: timestamp('resume_uploaded_at', { withTimezone: true }),
  resumeData: jsonb('resume_data').$type<Record<string, unknown>>(),
  workExperience: jsonb('work_experience').$type<{ title: string; company: string; from: string; to?: string; current?: boolean; description?: string }[]>(),
  education: jsonb('education').$type<{ degree: string; institution: string; year?: string }[]>(),
  openToWork: boolean('open_to_work').default(true).notNull(),
  // Talent profile / availability
  availabilityStatus: varchar('availability_status', { length: 20 }).default('actively_looking').notNull(), // actively_looking|open_to_work|not_looking
  visibility: varchar('visibility', { length: 20 }).default('employers_only').notNull(), // public|employers_only|hidden
  openToRelocate: boolean('open_to_relocate').default(false).notNull(),
  preferredEmirates: jsonb('preferred_emirates').$type<string[]>().default([]).notNull(),
  preferredJobTypes: jsonb('preferred_job_types').$type<string[]>().default([]).notNull(),
  preferredCategories: jsonb('preferred_categories').$type<string[]>().default([]).notNull(),
  yearsExperience: integer('years_experience').default(0).notNull(),
  expectedSalaryMin: integer('expected_salary_min'),
  expectedSalaryMax: integer('expected_salary_max'),
  showSalary: boolean('show_salary').default(false).notNull(),
  showWhatsapp: boolean('show_whatsapp').default(false).notNull(),
  lastActive: timestamp('last_active', { withTimezone: true }).defaultNow().notNull(),
  profileCompletedAt: timestamp('profile_completed_at', { withTimezone: true }),
  profileViews: integer('profile_views').default(0).notNull(),
  ...timestamps,
}, (t) => [index('jobseeker_username_idx').on(t.username), index('jobseeker_visibility_idx').on(t.visibility)]);

// ─── CV view logs (employer viewed a candidate) ──────────
export const cvViewLogs = pgTable('cv_view_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  profileUserId: uuid('profile_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('cv_view_employer_idx').on(t.employerId), index('cv_view_profile_idx').on(t.profileUserId)]);

// ─── Jobs ────────────────────────────────────────────────
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull(),
    employerId: uuid('employer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description').notNull(),
    categorySlug: varchar('category_slug', { length: 40 }).notNull(),
    emirateSlug: varchar('emirate_slug', { length: 40 }).notNull(),
    location: varchar('location', { length: 160 }),
    jobType: jobTypeEnum('job_type').notNull(),
    // Nullable + no default: "experience not specified" is a real, valid state.
    experienceLevel: experienceLevelEnum('experience_level'),
    visaStatus: visaStatusEnum('visa_status').default('any').notNull(),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryPeriod: salaryPeriodEnum('salary_period').default('monthly').notNull(),
    salaryHidden: boolean('salary_hidden').default(false).notNull(),
    salaryNegotiable: boolean('salary_negotiable').default(false).notNull(),
    showEmployerInfo: boolean('show_employer_info').default(true).notNull(),
    isRemote: boolean('is_remote').default(false).notNull(),
    isUrgent: boolean('is_urgent').default(false).notNull(),
    isFresher: boolean('is_fresher').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    freeZone: boolean('free_zone').default(false).notNull(),
    freeZoneName: varchar('free_zone_name', { length: 40 }),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    visaProvided: boolean('visa_provided').default(false).notNull(),
    // Who can apply: 'in_uae' | 'outside_uae' | 'both' (see APPLICANT_LOCATIONS).
    applicantLocation: varchar('applicant_location', { length: 20 }).default('both'),
    accommodationProvided: boolean('accommodation_provided').default(false).notNull(),
    skills: jsonb('skills').$type<string[]>().default([]).notNull(),
    benefits: jsonb('benefits').$type<string[]>().default([]).notNull(),
    applyEmail: varchar('apply_email', { length: 255 }),
    applyUrl: text('apply_url'),
    status: jobStatusEnum('status').default('pending').notNull(),
    source: varchar('source', { length: 50 }).default('manual').notNull(), // paste|whatsapp|whapi|telegram|email|csv|quick|url|manual|community|whatsapp_bot|quick_post|admin_web
    sourceMetadata: jsonb('source_metadata').$type<Record<string, unknown>>(), // original message, sender, etc.
    relation: varchar('relation', { length: 20 }), // community referral: work_there|friend_referred|other
    contactWhatsapp: varchar('contact_whatsapp', { length: 200 }),
    rejectionReason: text('rejection_reason'),
    viewCount: integer('view_count').default(0).notNull(),
    applicationCount: integer('application_count').default(0).notNull(),
    whatsappApplyCount: integer('whatsapp_apply_count').default(0).notNull(),
    cvApplyCount: integer('cv_apply_count').default(0).notNull(),
    aiGenerated: boolean('ai_generated').default(false).notNull(),
    // Walk-in interviews
    walkIn: boolean('walk_in').default(false).notNull(),
    walkInDate: date('walk_in_date'),
    walkInTime: varchar('walk_in_time', { length: 50 }),
    walkInTimeStart: varchar('walk_in_time_start', { length: 10 }),
    walkInTimeEnd: varchar('walk_in_time_end', { length: 10 }),
    walkInVenue: text('walk_in_venue'),
    walkInMapsUrl: text('walk_in_maps_url'),
    walkInLastDate: date('walk_in_last_date'),
    walkInContactPhone: varchar('walk_in_contact_phone', { length: 50 }),
    walkInRequiredDocs: text('walk_in_required_docs'),
    applyWhatsapp: varchar('apply_whatsapp', { length: 30 }),
    gccCountry: varchar('gcc_country', { length: 50 }).default('uae'),
    sourceCountry: varchar('source_country', { length: 50 }),
    titleAr: varchar('title_ar', { length: 160 }).default(''),
    descriptionAr: text('description_ar').default(''),
    requirementsAr: text('requirements_ar').default(''),
    benefitsAr: jsonb('benefits_ar').$type<string[]>().default([]),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('jobs_slug_idx').on(t.slug),
    index('jobs_status_idx').on(t.status),
    index('jobs_category_idx').on(t.categorySlug),
    index('jobs_emirate_idx').on(t.emirateSlug),
    index('jobs_employer_idx').on(t.employerId),
    index('jobs_published_idx').on(t.publishedAt),
  ],
);

// ─── Job templates ───────────────────────────────────────
export const jobTemplates = pgTable(
  'job_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    employerId: uuid('employer_id').references(() => users.id, { onDelete: 'cascade' }),
    isGlobal: boolean('is_global').default(false).notNull(),
    categorySlug: varchar('category_slug', { length: 40 }).notNull(),
    jobType: jobTypeEnum('job_type').notNull(),
    emirateSlug: varchar('emirate_slug', { length: 40 }),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    description: text('description').notNull(),
    requirements: text('requirements'),
    benefits: jsonb('benefits').$type<string[]>().default([]).notNull(),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    visaProvided: boolean('visa_provided').default(false).notNull(),
    accommodationProvided: boolean('accommodation_provided').default(false).notNull(),
    freshersWelcome: boolean('freshers_welcome').default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    index('templates_employer_idx').on(t.employerId),
    index('templates_global_idx').on(t.isGlobal),
    index('templates_category_idx').on(t.categorySlug),
  ],
);

// ─── Applications ────────────────────────────────────────
export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    seekerId: uuid('seeker_id').references(() => users.id, { onDelete: 'cascade' }),
    guestName: varchar('guest_name', { length: 160 }),
    guestEmail: varchar('guest_email', { length: 255 }),
    guestPhone: varchar('guest_phone', { length: 30 }),
    status: applicationStatusEnum('status').default('applied').notNull(),
    coverLetter: text('cover_letter'),
    resumeUrl: text('resume_url'),
    phone: varchar('phone', { length: 30 }),
    matchScore: integer('match_score'),
    aiSummary: text('ai_summary'),
    fraudScore: integer('fraud_score'),
    employerNote: text('employer_note'),
    respondedAt: timestamp('responded_at', { withTimezone: true }), // first employer response (for response-time badge)
    ...timestamps,
  },
  (t) => [
    index('applications_job_idx').on(t.jobId),
    index('applications_seeker_idx').on(t.seekerId),
    index('applications_status_idx').on(t.status),
  ],
);

// ─── Saved jobs ──────────────────────────────────────────
export const savedJobs = pgTable(
  'saved_jobs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] })],
);

// ─── Job alerts ──────────────────────────────────────────
export const jobAlerts = pgTable(
  'job_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Nullable: anonymous email subscriptions (from the homepage) have no user account.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }),
    keywords: varchar('keywords', { length: 160 }),
    categorySlug: varchar('category_slug', { length: 40 }),
    emirateSlug: varchar('emirate_slug', { length: 40 }),
    jobType: jobTypeEnum('job_type'),
    frequency: alertFrequencyEnum('frequency').default('daily').notNull(),
    channel: varchar('channel', { length: 16 }).default('email').notNull(), // email | whatsapp
    whatsappNumber: varchar('whatsapp_number', { length: 30 }),
    isActive: boolean('is_active').default(true).notNull(),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
    // Unsubscribe token for anonymous email alerts (nulls allowed for account-based alerts).
    token: varchar('token', { length: 64 }),
    ...timestamps,
  },
  (t) => [
    index('job_alerts_user_idx').on(t.userId),
    index('job_alerts_active_idx').on(t.isActive),
    uniqueIndex('job_alerts_email_idx').on(t.email),
    uniqueIndex('job_alerts_token_idx').on(t.token),
  ],
);

// ─── Blog ────────────────────────────────────────────────
export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    excerpt: text('excerpt'),
    content: text('content').notNull(),
    coverUrl: text('cover_url'),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    category: varchar('category', { length: 60 }),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    faqs: jsonb('faqs').$type<{ q: string; a: string }[]>().default([]).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    viewCount: integer('view_count').default(0).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('blog_slug_idx').on(t.slug), index('blog_published_idx').on(t.isPublished)],
);

// ─── WhatsApp groups ─────────────────────────────────────
export const whatsappGroups = pgTable(
  'whatsapp_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    inviteUrl: text('invite_url').notNull(),
    categorySlug: varchar('category_slug', { length: 40 }),
    emirateSlug: varchar('emirate_slug', { length: 40 }),
    description: text('description'),
    memberCount: integer('member_count').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    // Community linkage (additive)
    slug: varchar('slug', { length: 120 }),
    jobsSharedCount: integer('jobs_shared_count').default(0).notNull(),
    hiresCount: integer('hires_count').default(0).notNull(),
    weeklyActivity: integer('weekly_activity').default(0).notNull(),
    coverImage: varchar('cover_image', { length: 500 }),
    groupDescription: text('group_description'),
    pinnedMessage: text('pinned_message'),
    volunteerId: uuid('volunteer_id').references(() => users.id, { onDelete: 'set null' }),
    lastBlastedAt: timestamp('last_blasted_at', { withTimezone: true }),
    isVerified: boolean('is_verified').default(false).notNull(),
    badgeFeatured: boolean('badge_featured').default(false).notNull(),
    badgeMostActive: boolean('badge_most_active').default(false).notNull(),
    badgeFastestHiring: boolean('badge_fastest_hiring').default(false).notNull(),
    ...timestamps,
  },
  (t) => [index('wa_category_idx').on(t.categorySlug), index('wa_emirate_idx').on(t.emirateSlug), uniqueIndex('wa_slug_idx').on(t.slug)],
);

// ─── WhatsApp posting bot (Twilio) ───────────────────────
export const whatsappAdmins = pgTable('whatsapp_admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 30 }).notNull().unique(), // e.g. +971501234567
  name: varchar('name', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const whatsappBotSessions = pgTable('whatsapp_bot_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 30 }).notNull().unique(),
  state: varchar('state', { length: 50 }).default('idle').notNull(), // idle | awaiting_confirm
  draft: jsonb('draft').$type<Record<string, unknown>>().default({}).notNull(),
  pendingField: varchar('pending_field', { length: 50 }),
  lastActivity: timestamp('last_activity', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const whatsappBotLogs = pgTable(
  'whatsapp_bot_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phone: varchar('phone', { length: 30 }),
    direction: varchar('direction', { length: 10 }), // in | out
    message: text('message'),
    parsedData: jsonb('parsed_data').$type<Record<string, unknown>>(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('wa_bot_logs_phone_idx').on(t.phone), index('wa_bot_logs_created_idx').on(t.createdAt)],
);

// ─── Career tips (GoCareer-style) ────────────────────────
export const careerTips = pgTable('career_tips', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 50 }), // resume|interview|job_search|salary|visa
  title: varchar('title', { length: 200 }).notNull(),
  body: text('body').notNull(),
  icon: varchar('icon', { length: 10 }),
  isActive: boolean('active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── GCC countries (expansion) ───────────────────────────
export const gccCountries = pgTable('gcc_countries', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 50 }).unique(), // uae|saudi-arabia|qatar|kuwait|oman|bahrain
  name: varchar('name', { length: 100 }),
  flag: varchar('flag', { length: 10 }),
  currency: varchar('currency', { length: 10 }),
  isActive: boolean('active').default(true).notNull(),
});

export const gccWaitlist = pgTable(
  'gcc_waitlist',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    country: varchar('country', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('gcc_waitlist_country_idx').on(t.country)],
);

// ─── Salary reports (crowd-sourced) ──────────────────────
export const salaryReports = pgTable(
  'salary_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    jobTitle: varchar('job_title', { length: 160 }).notNull(),
    categorySlug: varchar('category_slug', { length: 40 }),
    emirateSlug: varchar('emirate_slug', { length: 40 }),
    experienceLevel: experienceLevelEnum('experience_level'),
    salaryMonthly: integer('salary_monthly').notNull(),
    yearsExperience: integer('years_experience'),
    companyName: varchar('company_name', { length: 160 }),
    isVerified: boolean('is_verified').default(false).notNull(),
    ...timestamps,
  },
  (t) => [index('salary_category_idx').on(t.categorySlug), index('salary_title_idx').on(t.jobTitle)],
);

// ─── Community posts ─────────────────────────────────────
export const communityPosts = pgTable(
  'community_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    parentId: uuid('parent_id'),
    title: varchar('title', { length: 200 }),
    body: text('body').notNull(),
    categorySlug: varchar('category_slug', { length: 40 }),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    upvotes: integer('upvotes').default(0).notNull(),
    replyCount: integer('reply_count').default(0).notNull(),
    isAnswer: boolean('is_answer').default(false).notNull(),
    isPinned: boolean('is_pinned').default(false).notNull(),
    ...timestamps,
  },
  (t) => [index('community_parent_idx').on(t.parentId), index('community_category_idx').on(t.categorySlug)],
);

// ─── Notifications ───────────────────────────────────────
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 60 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body'),
    link: text('link'),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('notifications_user_idx').on(t.userId), index('notifications_read_idx').on(t.isRead)],
);

// ─── Audit logs ──────────────────────────────────────────
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 80 }).notNull(),
    entity: varchar('entity', { length: 60 }),
    entityId: varchar('entity_id', { length: 80 }),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    ip: varchar('ip', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('audit_actor_idx').on(t.actorId), index('audit_action_idx').on(t.action)],
);

// ─── Short links (job sharing) ───────────────────────────
export const shortLinks = pgTable(
  'short_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 16 }).notNull(),
    url: text('url').notNull(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
    clicks: integer('clicks').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('short_links_code_idx').on(t.code), index('short_links_job_idx').on(t.jobId)],
);

// ─── Job categories (admin-managed; mirrors the static CATEGORIES) ──
export const jobCategories = pgTable(
  'job_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 60 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    nameAr: varchar('name_ar', { length: 120 }),
    icon: varchar('icon', { length: 60 }),
    parentId: uuid('parent_id'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    jobCount: integer('job_count').default(0).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('job_categories_slug_idx').on(t.slug)],
);

// ─── Feedback / contact inbox ────────────────────────────
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    subject: varchar('subject', { length: 200 }).notNull(),
    message: text('message').notNull(),
    type: varchar('type', { length: 20 }).default('general').notNull(), // general|bug|suggestion|complaint|partnership
    status: varchar('status', { length: 20 }).default('unread').notNull(), // unread|read|replied|archived
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: varchar('user_agent', { length: 400 }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    adminNote: text('admin_note'),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('feedback_status_idx').on(t.status), index('feedback_created_idx').on(t.createdAt)],
);

// ─── Whapi import settings (single-row config) ───────────
export const whapiSettings = pgTable('whapi_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  minTextLength: integer('min_text_length').default(30).notNull(),
  requireSalary: boolean('require_salary').default(false).notNull(),
  requireContact: boolean('require_contact').default(false).notNull(),
  requireLocation: boolean('require_location').default(false).notNull(),
  allowedGroups: jsonb('allowed_groups').$type<string[]>().default([]).notNull(),
  blockedNumbers: jsonb('blocked_numbers').$type<string[]>().default([]).notNull(),
  blockedKeywords: jsonb('blocked_keywords').$type<string[]>().default([]).notNull(),
  customKeywords: jsonb('custom_keywords').$type<string[]>().default([]).notNull(),
  blockOwnMessages: boolean('block_own_messages').default(true).notNull(),
  autoPublish: boolean('auto_publish').default(false).notNull(),
  replyOnSuccess: boolean('reply_on_success').default(true).notNull(),
  replyOnSkip: boolean('reply_on_skip').default(false).notNull(),
  successMessage: text('success_message'),
  skipMessage: text('skip_message'),
  ...timestamps,
});

// ─── Site settings (key/value) ───────────────────────────
export const siteSettings = pgTable('site_settings', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: jsonb('value').$type<unknown>(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ─── Company reviews ─────────────────────────────────────
export const companyReviews = pgTable(
  'company_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    cultureRating: integer('culture_rating'),
    salaryRating: integer('salary_rating'),
    managementRating: integer('management_rating'),
    worklifeRating: integer('worklife_rating'),
    title: varchar('title', { length: 200 }),
    pros: text('pros'),
    cons: text('cons'),
    advice: text('advice'),
    wouldRecommend: boolean('would_recommend'),
    isAnonymous: boolean('is_anonymous').default(true).notNull(),
    verified: boolean('verified').default(false).notNull(),
    employerResponse: text('employer_response'),
    jobTitle: varchar('job_title', { length: 160 }),
    isApproved: boolean('is_approved').default(false).notNull(),
    ...timestamps,
  },
  (t) => [index('reviews_company_idx').on(t.companyId)],
);

// ─── Relations ───────────────────────────────────────────
export const jobseekerProfilesRelations = relations(jobseekerProfiles, ({ one }) => ({
  user: one(users, { fields: [jobseekerProfiles.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  jobseekerProfile: one(jobseekerProfiles, {
    fields: [users.id],
    references: [jobseekerProfiles.userId],
  }),
  employerProfile: one(employerProfiles, {
    fields: [users.id],
    references: [employerProfiles.userId],
  }),
  jobs: many(jobs),
  applications: many(applications),
  savedJobs: many(savedJobs),
  jobAlerts: many(jobAlerts),
  notifications: many(notifications),
  jobTemplates: many(jobTemplates),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  jobs: many(jobs),
  reviews: many(companyReviews),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  employer: one(users, { fields: [jobs.employerId], references: [users.id] }),
  company: one(companies, { fields: [jobs.companyId], references: [companies.id] }),
  applications: many(applications),
  savedBy: many(savedJobs),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  seeker: one(users, { fields: [applications.seekerId], references: [users.id] }),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  job: one(jobs, { fields: [savedJobs.jobId], references: [jobs.id] }),
  user: one(users, { fields: [savedJobs.userId], references: [users.id] }),
}));

export const jobAlertsRelations = relations(jobAlerts, ({ one }) => ({
  user: one(users, { fields: [jobAlerts.userId], references: [users.id] }),
}));

export const companyReviewsRelations = relations(companyReviews, ({ one }) => ({
  company: one(companies, { fields: [companyReviews.companyId], references: [companies.id] }),
  author: one(users, { fields: [companyReviews.authorId], references: [users.id] }),
}));

export const jobTemplatesRelations = relations(jobTemplates, ({ one }) => ({
  employer: one(users, { fields: [jobTemplates.employerId], references: [users.id] }),
}));

// ─── Skill assessments ───────────────────────────────────
export type AssessmentQuestion = { q: string; options: string[]; correct: number };

export const skillAssessments = pgTable(
  'skill_assessments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    categorySlug: varchar('category_slug', { length: 40 }).notNull(),
    description: text('description'),
    questions: jsonb('questions').$type<AssessmentQuestion[]>().notNull(),
    timeLimitSec: integer('time_limit_sec').default(60).notNull(),
    passScore: integer('pass_score').default(70).notNull(),
    badgeName: varchar('badge_name', { length: 60 }).notNull(),
    badgeColor: varchar('badge_color', { length: 20 }).default('#2a9aa4').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    employerId: uuid('employer_id').references(() => users.id, { onDelete: 'cascade' }), // null = platform test
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('assessment_slug_idx').on(t.slug), index('assessment_category_idx').on(t.categorySlug), index('assessment_employer_idx').on(t.employerId)],
);

export const assessmentResults = pgTable(
  'assessment_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => skillAssessments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    passed: boolean('passed').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('result_assessment_idx').on(t.assessmentId),
    index('result_user_idx').on(t.userId),
    index('result_completed_idx').on(t.completedAt),
  ],
);

export const skillAssessmentsRelations = relations(skillAssessments, ({ many }) => ({
  results: many(assessmentResults),
}));

export const assessmentResultsRelations = relations(assessmentResults, ({ one }) => ({
  assessment: one(skillAssessments, { fields: [assessmentResults.assessmentId], references: [skillAssessments.id] }),
  user: one(users, { fields: [assessmentResults.userId], references: [users.id] }),
}));

// ─── Direct messages (unlock after shortlist) ────────────
export const directMessages = pgTable(
  'direct_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    receiverId: uuid('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('dm_sender_idx').on(t.senderId),
    index('dm_receiver_idx').on(t.receiverId),
    index('dm_pair_idx').on(t.senderId, t.receiverId),
  ],
);

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, { fields: [directMessages.senderId], references: [users.id], relationName: 'dm_sender' }),
  receiver: one(users, { fields: [directMessages.receiverId], references: [users.id], relationName: 'dm_receiver' }),
  job: one(jobs, { fields: [directMessages.jobId], references: [jobs.id] }),
}));

// ─── Saved-job folders ───────────────────────────────────
export const savedJobFolders = pgTable(
  'saved_job_folders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 60 }).notNull(),
    color: varchar('color', { length: 20 }).default('#2a9aa4').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('saved_folder_user_idx').on(t.userId)],
);

export const savedJobFoldersRelations = relations(savedJobFolders, ({ one }) => ({
  user: one(users, { fields: [savedJobFolders.userId], references: [users.id] }),
}));

// ─── Interview scorecards ────────────────────────────────
export type ScorecardItem = { competency: string; weight: number; score: number };

export const interviewScorecards = pgTable(
  'interview_scorecards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    candidateName: varchar('candidate_name', { length: 160 }).notNull(),
    items: jsonb('items').$type<ScorecardItem[]>().notNull(),
    weightedTotal: real('weighted_total').notNull(),
    recommendation: varchar('recommendation', { length: 40 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('scorecard_employer_idx').on(t.employerId), index('scorecard_job_idx').on(t.jobId)],
);

export const interviewScorecardsRelations = relations(interviewScorecards, ({ one }) => ({
  employer: one(users, { fields: [interviewScorecards.employerId], references: [users.id] }),
  job: one(jobs, { fields: [interviewScorecards.jobId], references: [jobs.id] }),
}));

// ─── Virtual hiring events ───────────────────────────────
export const hiringEvents = pgTable(
  'hiring_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    emirate: varchar('emirate', { length: 40 }),
    rolesText: text('roles_text'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    durationMin: integer('duration_min').default(60).notNull(),
    meetingUrl: text('meeting_url'),
    maxAttendees: integer('max_attendees'),
    isPublished: boolean('is_published').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('event_employer_idx').on(t.employerId), index('event_starts_idx').on(t.startsAt)],
);

export const hiringEventsRelations = relations(hiringEvents, ({ one }) => ({
  employer: one(users, { fields: [hiringEvents.employerId], references: [users.id] }),
}));

// ─── Employer team / sub-accounts ────────────────────────
export const employerTeamMembers = pgTable(
  'employer_team_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('recruiter'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('team_owner_email_idx').on(t.ownerId, t.email), index('team_owner_idx').on(t.ownerId)],
);

export const employerTeamMembersRelations = relations(employerTeamMembers, ({ one }) => ({
  owner: one(users, { fields: [employerTeamMembers.ownerId], references: [users.id], relationName: 'team_owner' }),
  member: one(users, { fields: [employerTeamMembers.userId], references: [users.id], relationName: 'team_member' }),
}));

// ─── Video interviews ────────────────────────────────────
export type VideoQuestion = { text: string; timeLimitSec: number };
export type VideoAnswer = { questionText: string; videoUrl: string };

export const videoInterviews = pgTable(
  'video_interviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }).notNull(),
    questions: jsonb('questions').$type<VideoQuestion[]>().notNull(),
    shareToken: varchar('share_token', { length: 32 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('vi_token_idx').on(t.shareToken), index('vi_employer_idx').on(t.employerId)],
);

export const videoResponses = pgTable(
  'video_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    interviewId: uuid('interview_id').notNull().references(() => videoInterviews.id, { onDelete: 'cascade' }),
    applicantName: varchar('applicant_name', { length: 160 }).notNull(),
    applicantEmail: varchar('applicant_email', { length: 255 }),
    answers: jsonb('answers').$type<VideoAnswer[]>().notNull(),
    aiScore: integer('ai_score'),
    aiSentiment: varchar('ai_sentiment', { length: 40 }),
    aiTranscript: text('ai_transcript'),
    aiSummary: text('ai_summary'),
    status: varchar('status', { length: 20 }).notNull().default('submitted'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('vr_interview_idx').on(t.interviewId)],
);

export const videoInterviewsRelations = relations(videoInterviews, ({ one, many }) => ({
  employer: one(users, { fields: [videoInterviews.employerId], references: [users.id] }),
  responses: many(videoResponses),
}));
export const videoResponsesRelations = relations(videoResponses, ({ one }) => ({
  interview: one(videoInterviews, { fields: [videoResponses.interviewId], references: [videoInterviews.id] }),
}));

// ─── Success stories ─────────────────────────────────────
export const successStories = pgTable(
  'success_stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    seekerName: varchar('seeker_name', { length: 160 }).notNull(),
    role: varchar('role', { length: 160 }).notNull(),
    company: varchar('company', { length: 160 }),
    emirate: varchar('emirate', { length: 40 }),
    story: text('story').notNull(),
    timeToHire: varchar('time_to_hire', { length: 60 }),
    tips: text('tips'),
    photoUrl: text('photo_url'),
    isPublished: boolean('is_published').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('success_published_idx').on(t.isPublished)],
);

// ─── Web push subscriptions ──────────────────────────────
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('push_endpoint_idx').on(t.endpoint), index('push_user_idx').on(t.userId)],
);

// ─── Company followers (Phase 6) ─────────────────────────
export const companyFollowers = pgTable(
  'company_followers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    seekerId: uuid('seeker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('company_follow_unique_idx').on(t.seekerId, t.companyId),
    index('company_follow_company_idx').on(t.companyId),
  ],
);

// ─── AMA sessions (Phase 8) ──────────────────────────────
export const amaSessions = pgTable(
  'ama_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull(),
    expertName: varchar('expert_name', { length: 160 }).notNull(),
    expertTitle: varchar('expert_title', { length: 200 }),
    expertCompany: varchar('expert_company', { length: 160 }),
    expertPhoto: text('expert_photo'),
    topic: varchar('topic', { length: 240 }).notNull(),
    description: text('description'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    durationMin: integer('duration_min').default(60).notNull(),
    recordingUrl: text('recording_url'),
    summary: text('summary'),
    status: varchar('status', { length: 20 }).default('upcoming').notNull(), // upcoming | live | past
    ...timestamps,
  },
  (t) => [uniqueIndex('ama_slug_idx').on(t.slug), index('ama_status_idx').on(t.status)],
);

export const amaQuestions = pgTable(
  'ama_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').notNull().references(() => amaSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    question: text('question').notNull(),
    upvotes: integer('upvotes').default(0).notNull(),
    answered: boolean('answered').default(false).notNull(),
    answer: text('answer'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('ama_q_session_idx').on(t.sessionId)],
);

// ─── Seeker credentials (Phase 9) ────────────────────────
export const seekerCredentials = pgTable(
  'seeker_credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    seekerId: uuid('seeker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    credentialType: varchar('credential_type', { length: 80 }).notNull(), // degree | certificate | license
    issuer: varchar('issuer', { length: 200 }).notNull(),
    title: varchar('title', { length: 200 }),
    year: varchar('year', { length: 10 }),
    fileUrl: text('file_url'),
    verificationHash: varchar('verification_hash', { length: 64 }),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | verified | rejected
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('cred_seeker_idx').on(t.seekerId),
    uniqueIndex('cred_hash_idx').on(t.verificationHash),
    index('cred_status_idx').on(t.status),
  ],
);

// ─── Culture profiles (Phase 10) ─────────────────────────
export const cultureProfiles = pgTable(
  'culture_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    userType: varchar('user_type', { length: 20 }).notNull(), // seeker | employer
    answers: jsonb('answers').$type<Record<string, string>>().default({}).notNull(),
    aiSummary: jsonb('ai_summary').$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [uniqueIndex('culture_user_idx').on(t.userId)],
);

// ─── Course affiliate clicks (Phase 13) ──────────────────
export const courseClicks = pgTable(
  'course_clicks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    courseId: varchar('course_id', { length: 120 }).notNull(),
    provider: varchar('provider', { length: 120 }),
    url: text('url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('course_click_course_idx').on(t.courseId)],
);

// ════════════════════════════════════════════════════════
// Employer ATS suite (additive)
// ════════════════════════════════════════════════════════

const DEFAULT_STAGES = [
  { id: 'new', name: 'New', order: 0 },
  { id: 'screened', name: 'Screened', order: 1 },
  { id: 'phone', name: 'Phone Interview', order: 2 },
  { id: 'test', name: 'Skills Test', order: 3 },
  { id: 'interview', name: 'Final Interview', order: 4 },
  { id: 'offer', name: 'Offer', order: 5 },
  { id: 'hired', name: 'Hired', order: 6 },
];

export const hiringPipelines = pgTable(
  'hiring_pipelines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    stages: jsonb('stages').$type<{ id: string; name: string; order: number }[]>().default(DEFAULT_STAGES).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('pipeline_job_idx').on(t.jobId)],
);

export const applicationStages = pgTable(
  'application_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    stageId: varchar('stage_id', { length: 40 }).notNull(),
    movedBy: uuid('moved_by').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    movedAt: timestamp('moved_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('appstage_app_idx').on(t.applicationId), index('appstage_job_idx').on(t.jobId)],
);

export const scorecards = pgTable(
  'scorecards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    competencies: jsonb('competencies').$type<{ name: string; weight: number; description?: string; criteria?: Record<string, string> }[]>().default([]).notNull(),
    ...timestamps,
  },
  (t) => [index('sc_employer_idx').on(t.employerId), index('sc_job_idx').on(t.jobId)],
);

export const scorecardResults = pgTable(
  'scorecard_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scorecardId: uuid('scorecard_id').notNull().references(() => scorecards.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    interviewerId: uuid('interviewer_id').references(() => users.id, { onDelete: 'set null' }),
    scores: jsonb('scores').$type<Record<string, number>>().default({}).notNull(),
    totalScore: integer('total_score'),
    recommendation: varchar('recommendation', { length: 30 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('scresult_app_idx').on(t.applicationId), index('scresult_card_idx').on(t.scorecardId)],
);

export const talentPool = pgTable(
  'talent_pool',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    followUpDate: date('follow_up_date'),
    addedFromJobId: uuid('added_from_job_id').references(() => jobs.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('talent_unique_idx').on(t.employerId, t.candidateId), index('talent_employer_idx').on(t.employerId)],
);

export const interviewSlots = pgTable(
  'interview_slots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    booked: boolean('booked').default(false).notNull(),
    applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'set null' }),
    zoomLink: varchar('zoom_link', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('slot_employer_idx').on(t.employerId), index('slot_job_idx').on(t.jobId)],
);

export const interviewBookings = pgTable(
  'interview_bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slotId: uuid('slot_id').notNull().references(() => interviewSlots.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    reminderSent24h: boolean('reminder_sent_24h').default(false).notNull(),
    reminderSent1h: boolean('reminder_sent_1h').default(false).notNull(),
    calendarInviteSent: boolean('calendar_invite_sent').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('booking_slot_idx').on(t.slotId)],
);

export const offerLetters = pgTable(
  'offer_letters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id').references(() => users.id, { onDelete: 'set null' }),
    salary: integer('salary'),
    currency: varchar('currency', { length: 8 }).default('AED').notNull(),
    startDate: date('start_date'),
    probationMonths: integer('probation_months').default(6).notNull(),
    benefits: jsonb('benefits').$type<string[]>().default([]).notNull(),
    content: text('content'),
    token: varchar('token', { length: 64 }).notNull(),
    status: varchar('status', { length: 20 }).default('draft').notNull(), // draft|sent|viewed|accepted|declined
    declineReason: text('decline_reason'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('offer_token_idx').on(t.token), index('offer_employer_idx').on(t.employerId), index('offer_app_idx').on(t.applicationId)],
);

export const skillsAssessmentsResults = pgTable(
  'skills_assessments_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assessmentId: uuid('assessment_id').references(() => skillAssessments.id, { onDelete: 'set null' }),
    applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id').references(() => users.id, { onDelete: 'set null' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    score: integer('score'),
    passed: boolean('passed').default(false).notNull(),
    answers: jsonb('answers').$type<Record<string, unknown>>(),
    timeTaken: integer('time_taken'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sar_app_idx').on(t.applicationId), index('sar_job_idx').on(t.jobId)],
);

export const candidateNotes = pgTable(
  'candidate_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    isPrivate: boolean('is_private').default(false).notNull(),
    mentions: jsonb('mentions').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('cnote_app_idx').on(t.applicationId)],
);

export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
    offerId: uuid('offer_id').references(() => offerLetters.id, { onDelete: 'cascade' }),
    requestedBy: uuid('requested_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending|approved|rejected
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [index('approval_status_idx').on(t.status), index('approval_requestedby_idx').on(t.requestedBy)],
);

export const referenceCheckRequests = pgTable(
  'referencecheck_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    refereeName: varchar('referee_name', { length: 160 }).notNull(),
    refereeEmail: varchar('referee_email', { length: 255 }),
    refereePhone: varchar('referee_phone', { length: 40 }),
    refereeRelation: varchar('referee_relation', { length: 120 }),
    token: varchar('token', { length: 64 }).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending|sent|completed
    answers: jsonb('answers').$type<Record<string, unknown>>(),
    aiSummary: text('ai_summary'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('refcheck_token_idx').on(t.token), index('refcheck_app_idx').on(t.applicationId)],
);

export const securityLogs = pgTable(
  'security_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    event: varchar('event', { length: 60 }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 400 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    severity: varchar('severity', { length: 20 }).default('info').notNull(), // info|warn|error|critical
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('seclog_event_idx').on(t.event), index('seclog_ip_idx').on(t.ip), index('seclog_created_idx').on(t.createdAt)],
);

export const hiringAnalytics = pgTable(
  'hiring_analytics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    metric: varchar('metric', { length: 60 }).notNull(),
    value: real('value').default(0).notNull(),
    period: date('period'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('hanalytics_employer_idx').on(t.employerId), index('hanalytics_metric_idx').on(t.metric)],
);

// ════════════════════════════════════════════════════════
// WhatsApp community suite (additive)
// ════════════════════════════════════════════════════════

export const groupJobBlasts = pgTable(
  'group_job_blasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id').notNull().references(() => whatsappGroups.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    blasterId: uuid('blaster_id').references(() => users.id, { onDelete: 'set null' }),
    message: text('message'),
    blastType: varchar('blast_type', { length: 30 }).default('manual').notNull(),
    clickCount: integer('click_count').default(0).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('blast_group_idx').on(t.groupId), index('blast_job_idx').on(t.jobId)],
);

export const volunteerStats = pgTable(
  'volunteer_stats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').references(() => whatsappGroups.id, { onDelete: 'set null' }),
    month: date('month'),
    jobsShared: integer('jobs_shared').default(0).notNull(),
    membersReferred: integer('members_referred').default(0).notNull(),
    hiresTracked: integer('hires_tracked').default(0).notNull(),
    points: integer('points').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('vstats_user_idx').on(t.userId), index('vstats_group_idx').on(t.groupId)],
);

export const referralCodes = pgTable(
  'referral_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 20 }).notNull(),
    totalClicks: integer('total_clicks').default(0).notNull(),
    totalConversions: integer('total_conversions').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('refcode_code_idx').on(t.code), uniqueIndex('refcode_user_idx').on(t.userId)],
);

export const referrals = pgTable(
  'referrals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    referrerId: uuid('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    referredId: uuid('referred_id').references(() => users.id, { onDelete: 'cascade' }),
    referralCode: varchar('referral_code', { length: 20 }).notNull(),
    source: varchar('source', { length: 40 }),
    groupId: uuid('group_id').references(() => whatsappGroups.id, { onDelete: 'set null' }),
    converted: boolean('converted').default(false).notNull(),
    conversionType: varchar('conversion_type', { length: 40 }),
    rewardPoints: integer('reward_points').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
  },
  (t) => [index('referral_referrer_idx').on(t.referrerId), index('referral_code_idx').on(t.referralCode)],
);

export const communityQa = pgTable(
  'community_qa',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 200 }).notNull(),
    categorySlug: varchar('category_slug', { length: 40 }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    question: text('question').notNull(),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    upvotes: integer('upvotes').default(0).notNull(),
    answerCount: integer('answer_count').default(0).notNull(),
    isAnswered: boolean('is_answered').default(false).notNull(),
    isApproved: boolean('is_approved').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('qa_slug_idx').on(t.slug), index('qa_category_idx').on(t.categorySlug)],
);

export const communityQaAnswers = pgTable(
  'community_qa_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id').notNull().references(() => communityQa.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    answer: text('answer').notNull(),
    upvotes: integer('upvotes').default(0).notNull(),
    isAccepted: boolean('is_accepted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('qaans_question_idx').on(t.questionId)],
);

export const salaryPolls = pgTable(
  'salary_polls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categorySlug: varchar('category_slug', { length: 40 }),
    emirate: varchar('emirate', { length: 40 }),
    question: text('question').notNull(),
    options: jsonb('options').$type<string[]>().default([]).notNull(),
    responses: jsonb('responses').$type<Record<string, number>>().default({}).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('poll_category_idx').on(t.categorySlug)],
);

export const salaryPollResponses = pgTable(
  'salary_poll_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pollId: uuid('poll_id').notNull().references(() => salaryPolls.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    selectedOption: varchar('selected_option', { length: 120 }).notNull(),
    isAnonymous: boolean('is_anonymous').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('pollresp_unique_idx').on(t.pollId, t.userId)],
);

export const communityEvents = pgTable(
  'community_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 200 }).notNull(),
    groupId: uuid('group_id').references(() => whatsappGroups.id, { onDelete: 'set null' }),
    categorySlug: varchar('category_slug', { length: 40 }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    hostId: uuid('host_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 40 }),
    zoomLink: varchar('zoom_link', { length: 500 }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    durationMinutes: integer('duration_minutes').default(60).notNull(),
    maxAttendees: integer('max_attendees'),
    status: varchar('status', { length: 20 }).default('upcoming').notNull(),
    recordingUrl: varchar('recording_url', { length: 500 }),
    summary: text('summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('cevent_slug_idx').on(t.slug), index('cevent_status_idx').on(t.status)],
);

export const communityEventRsvps = pgTable(
  'community_event_rsvps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id').notNull().references(() => communityEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    attended: boolean('attended').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('rsvp_unique_idx').on(t.eventId, t.userId)],
);

export const mentorProfiles = pgTable(
  'mentor_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    professions: jsonb('professions').$type<string[]>().default([]).notNull(),
    emirates: jsonb('emirates').$type<string[]>().default([]).notNull(),
    topics: jsonb('topics').$type<string[]>().default([]).notNull(),
    bio: text('bio'),
    availableDays: jsonb('available_days').$type<string[]>().default([]).notNull(),
    availableTimes: jsonb('available_times').$type<string[]>().default([]).notNull(),
    maxMenteesPerMonth: integer('max_mentees_per_month').default(3).notNull(),
    totalSessions: integer('total_sessions').default(0).notNull(),
    ratingAvg: real('rating_avg').default(0).notNull(),
    isApproved: boolean('is_approved').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('mentor_user_idx').on(t.userId)],
);

export const mentorRequests = pgTable(
  'mentor_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    menteeId: uuid('mentee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    mentorId: uuid('mentor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    topic: varchar('topic', { length: 120 }),
    message: text('message'),
    preferredTime: varchar('preferred_time', { length: 120 }),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    zoomLink: varchar('zoom_link', { length: 500 }),
    notes: text('notes'),
    rating: integer('rating'),
    ratingComment: text('rating_comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('mreq_mentor_idx').on(t.mentorId), index('mreq_mentee_idx').on(t.menteeId)],
);

export const groupSuccessStories = pgTable(
  'group_success_stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 200 }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    groupId: uuid('group_id').references(() => whatsappGroups.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }).notNull(),
    story: text('story').notNull(),
    photo: varchar('photo', { length: 500 }),
    jobTitle: varchar('job_title', { length: 160 }),
    company: varchar('company', { length: 160 }),
    emirate: varchar('emirate', { length: 40 }),
    weeksToHire: integer('weeks_to_hire'),
    tips: text('tips'),
    approved: boolean('approved').default(false).notNull(),
    featured: boolean('featured').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('gstory_slug_idx').on(t.slug), index('gstory_group_idx').on(t.groupId)],
);

export const scamReports = pgTable(
  'scam_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    text: text('text'),
    riskScore: integer('risk_score'),
    flags: jsonb('flags').$type<string[]>().default([]).notNull(),
    source: varchar('source', { length: 60 }),
    reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('scam_status_idx').on(t.status)],
);
