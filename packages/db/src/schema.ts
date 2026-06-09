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
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
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
  resumeData: jsonb('resume_data').$type<Record<string, unknown>>(),
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
  profileViews: integer('profile_views').default(0).notNull(),
  ...timestamps,
}, (t) => [index('jobseeker_username_idx').on(t.username), index('jobseeker_visibility_idx').on(t.visibility)]);

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
    experienceLevel: experienceLevelEnum('experience_level').notNull(),
    visaStatus: visaStatusEnum('visa_status').default('any').notNull(),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryPeriod: salaryPeriodEnum('salary_period').default('monthly').notNull(),
    salaryHidden: boolean('salary_hidden').default(false).notNull(),
    isRemote: boolean('is_remote').default(false).notNull(),
    isUrgent: boolean('is_urgent').default(false).notNull(),
    isFresher: boolean('is_fresher').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    freeZone: boolean('free_zone').default(false).notNull(),
    freeZoneName: varchar('free_zone_name', { length: 40 }),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    visaProvided: boolean('visa_provided').default(false).notNull(),
    accommodationProvided: boolean('accommodation_provided').default(false).notNull(),
    skills: jsonb('skills').$type<string[]>().default([]).notNull(),
    benefits: jsonb('benefits').$type<string[]>().default([]).notNull(),
    applyEmail: varchar('apply_email', { length: 255 }),
    applyUrl: text('apply_url'),
    status: jobStatusEnum('status').default('pending').notNull(),
    source: varchar('source', { length: 16 }).default('manual').notNull(), // paste|whatsapp|csv|quick|url|manual|community|whatsapp_bot|quick_post|admin_web
    relation: varchar('relation', { length: 20 }), // community referral: work_there|friend_referred|other
    contactWhatsapp: varchar('contact_whatsapp', { length: 30 }),
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
    walkInVenue: text('walk_in_venue'),
    walkInLastDate: date('walk_in_last_date'),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] })],
);

// ─── Job alerts ──────────────────────────────────────────
export const jobAlerts = pgTable(
  'job_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    keywords: varchar('keywords', { length: 160 }),
    categorySlug: varchar('category_slug', { length: 40 }),
    emirateSlug: varchar('emirate_slug', { length: 40 }),
    jobType: jobTypeEnum('job_type'),
    frequency: alertFrequencyEnum('frequency').default('daily').notNull(),
    channel: varchar('channel', { length: 16 }).default('email').notNull(), // email | whatsapp
    whatsappNumber: varchar('whatsapp_number', { length: 30 }),
    isActive: boolean('is_active').default(true).notNull(),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('job_alerts_user_idx').on(t.userId), index('job_alerts_active_idx').on(t.isActive)],
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
    ...timestamps,
  },
  (t) => [index('wa_category_idx').on(t.categorySlug), index('wa_emirate_idx').on(t.emirateSlug)],
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
    title: varchar('title', { length: 200 }),
    pros: text('pros'),
    cons: text('cons'),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('assessment_slug_idx').on(t.slug), index('assessment_category_idx').on(t.categorySlug)],
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
