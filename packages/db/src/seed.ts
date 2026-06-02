/**
 * Database seed for DdotsMediaJobs.
 * Run: pnpm db:seed   (requires DATABASE_URL + a migrated schema)
 *
 * Idempotent: clears domain tables then re-inserts deterministic demo data.
 */
import bcrypt from 'bcryptjs';
import { db } from './index';
import {
  users,
  employerProfiles,
  jobseekerProfiles,
  companies,
  jobs,
  whatsappGroups,
  salaryReports,
  blogPosts,
  siteSettings,
} from './schema';
import {
  CATEGORIES,
  EMIRATES,
  JOB_TYPES,
  EXPERIENCE_LEVELS,
  slugify,
} from '@ddots/shared';

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log('🌱 Seeding DdotsMediaJobs…');

  // Wipe (order respects FKs via cascade on users; explicit for clarity)
  await db.delete(jobs);
  await db.delete(jobseekerProfiles);
  await db.delete(employerProfiles);
  await db.delete(salaryReports);
  await db.delete(blogPosts);
  await db.delete(whatsappGroups);
  await db.delete(companies);
  await db.delete(users);

  // ── Users ──────────────────────────────────────────────
  const [admin] = await db
    .insert(users)
    .values({
      name: 'Site Admin',
      email: 'admin@ddotsmediajobs.com',
      passwordHash: await hash('Admin#12345'),
      role: 'admin',
      emailVerified: new Date(),
    })
    .returning();

  const [employer] = await db
    .insert(users)
    .values({
      name: 'Sara Hassan',
      email: 'employer@ddotsmediajobs.com',
      passwordHash: await hash('Employer#123'),
      role: 'employer',
      emailVerified: new Date(),
    })
    .returning();

  const [seeker] = await db
    .insert(users)
    .values({
      name: 'Ahmed Khan',
      email: 'seeker@ddotsmediajobs.com',
      passwordHash: await hash('Seeker#12345'),
      role: 'jobseeker',
      emailVerified: new Date(),
    })
    .returning();

  // ── Companies ──────────────────────────────────────────
  const companyData = [
    { name: 'Gulf Tech Solutions', industry: 'IT & Software', emirateSlug: 'dubai', size: '51-200' as const },
    { name: 'Emirates Health Group', industry: 'Healthcare', emirateSlug: 'abu-dhabi', size: '500-1000' as const },
    { name: 'Al Noor Construction', industry: 'Construction', emirateSlug: 'sharjah', size: '201-500' as const },
    { name: 'Palm Hospitality', industry: 'Hospitality', emirateSlug: 'dubai', size: '201-500' as const },
    { name: 'Desert Logistics', industry: 'Logistics', emirateSlug: 'dubai', size: '51-200' as const },
  ];
  const insertedCompanies = await db
    .insert(companies)
    .values(
      companyData.map((c) => ({
        ...c,
        slug: slugify(c.name),
        about: `${c.name} is a leading ${c.industry} employer in the UAE.`,
        isVerified: true,
      })),
    )
    .returning();

  await db.insert(employerProfiles).values({
    userId: employer!.id,
    companyId: insertedCompanies[0]!.id,
    companyName: insertedCompanies[0]!.name,
    position: 'HR Manager',
    emirateSlug: 'dubai',
    industry: 'IT & Software',
    isVerified: true,
  });

  await db.insert(jobseekerProfiles).values({
    userId: seeker!.id,
    headline: 'Full-Stack Developer · 4 years',
    bio: 'React, Node.js and PostgreSQL developer based in Dubai.',
    emirateSlug: 'dubai',
    categorySlug: 'it',
    experienceLevel: '3-5-years',
    visaStatus: 'employment-visa',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    openToWork: true,
  });

  // ── Jobs (a few per category) ──────────────────────────
  const sampleTitles: Record<string, string[]> = {
    it: ['Senior Software Engineer', 'DevOps Engineer', 'Data Analyst'],
    healthcare: ['Registered Nurse', 'Pharmacist', 'Lab Technician'],
    finance: ['Senior Accountant', 'Financial Analyst', 'Auditor'],
    sales: ['Sales Executive', 'Business Development Manager', 'Retail Supervisor'],
    construction: ['Civil Engineer', 'Site Supervisor', 'MEP Engineer'],
    hospitality: ['Hotel Receptionist', 'Chef de Partie', 'Guest Relations Officer'],
    driving: ['Light Vehicle Driver', 'Delivery Rider', 'Warehouse Associate'],
    education: ['Primary Teacher', 'Math Tutor', 'Academic Coordinator'],
    admin: ['Office Administrator', 'Executive Secretary', 'Receptionist'],
    manufacturing: ['Production Supervisor', 'Quality Inspector', 'Maintenance Technician'],
    security: ['Security Guard', 'Security Supervisor', 'Safety Officer'],
    beauty: ['Hair Stylist', 'Spa Therapist', 'Beautician'],
  };

  const jobRows: (typeof jobs.$inferInsert)[] = [];
  let n = 0;
  for (const cat of CATEGORIES) {
    const titles = sampleTitles[cat.slug] ?? ['Specialist'];
    for (const title of titles) {
      const emirate = EMIRATES[n % EMIRATES.length]!;
      const company = insertedCompanies[n % insertedCompanies.length]!;
      const min = 4000 + (n % 8) * 1500;
      jobRows.push({
        slug: `${slugify(title)}-${cat.slug}-${emirate.slug}-${n}`,
        employerId: employer!.id,
        companyId: company.id,
        title,
        description: `We are hiring a ${title} in ${emirate.name}. Join ${company.name} and grow your career in the UAE. Responsibilities include day-to-day operations, collaboration with the team, and delivering results. Requirements: relevant experience, strong communication skills, and a valid UAE residency or willingness to relocate.`,
        categorySlug: cat.slug,
        emirateSlug: emirate.slug,
        location: `${emirate.name}, UAE`,
        jobType: JOB_TYPES[n % JOB_TYPES.length]!,
        experienceLevel: EXPERIENCE_LEVELS[n % EXPERIENCE_LEVELS.length]!,
        visaStatus: 'any',
        salaryMin: min,
        salaryMax: min + 3000,
        salaryPeriod: 'monthly',
        isRemote: n % 7 === 0,
        isUrgent: n % 5 === 0,
        isFresher: n % 6 === 0,
        isFeatured: n % 9 === 0,
        skills: ['Communication', 'Teamwork', cat.name],
        benefits: ['Visa', 'Medical insurance', 'Annual ticket'],
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
      });
      n++;
    }
  }
  await db.insert(jobs).values(jobRows);

  // ── WhatsApp groups (73+) ──────────────────────────────
  const waRows: (typeof whatsappGroups.$inferInsert)[] = [];
  let g = 1;
  for (const cat of CATEGORIES) {
    for (const emirate of EMIRATES) {
      if (waRows.length >= 73 && g % 2 === 0) continue;
      waRows.push({
        name: `${cat.name} Jobs — ${emirate.name}`,
        inviteUrl: `https://chat.whatsapp.com/ddots-${cat.slug}-${emirate.slug}`,
        categorySlug: cat.slug,
        emirateSlug: emirate.slug,
        description: `Daily ${cat.name} job postings for ${emirate.name}.`,
        memberCount: 200 + ((g * 37) % 800),
        isActive: true,
      });
      g++;
    }
  }
  await db.insert(whatsappGroups).values(waRows);

  // ── Salary reports ─────────────────────────────────────
  const salaryRows: (typeof salaryReports.$inferInsert)[] = [];
  for (const cat of CATEGORIES) {
    const titles = sampleTitles[cat.slug] ?? ['Specialist'];
    titles.forEach((title, i) => {
      salaryRows.push({
        jobTitle: title,
        categorySlug: cat.slug,
        emirateSlug: EMIRATES[i % EMIRATES.length]!.slug,
        experienceLevel: EXPERIENCE_LEVELS[i % EXPERIENCE_LEVELS.length]!,
        salaryMonthly: 5000 + i * 2500 + (cat.slug === 'it' ? 4000 : 0),
        yearsExperience: 2 + i,
        isVerified: true,
      });
    });
  }
  await db.insert(salaryReports).values(salaryRows);

  // ── Blog ───────────────────────────────────────────────
  await db.insert(blogPosts).values([
    {
      slug: 'how-to-find-a-job-in-dubai',
      title: 'How to Find a Job in Dubai in 2026',
      excerpt: 'A practical step-by-step guide to landing a job in Dubai.',
      content:
        '# How to Find a Job in Dubai\n\nDubai remains one of the most attractive job markets in the region. Start by polishing your CV, targeting the right industries, and applying through trusted portals like DdotsMediaJobs.\n\n## 1. Optimise your CV\nKeep it to two pages, lead with achievements, and tailor it per role.\n\n## 2. Use the right channels\nApply on job portals, join WhatsApp groups, and network on LinkedIn.\n\n## 3. Understand visa status\nEmployers often prefer candidates already on a transferable or cancelled visa.',
      authorId: admin!.id,
      category: 'Career Advice',
      tags: ['dubai', 'job-search', 'cv'],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      slug: 'uae-salary-guide-2026',
      title: 'UAE Salary Guide 2026: What to Expect',
      excerpt: 'Average salaries across key UAE industries for 2026.',
      content:
        '# UAE Salary Guide 2026\n\nSalaries in the UAE vary widely by industry, experience, and emirate. This guide breaks down typical monthly ranges so you can negotiate with confidence.',
      authorId: admin!.id,
      category: 'Salary',
      tags: ['salary', 'uae', 'guide'],
      isPublished: true,
      publishedAt: new Date(),
    },
  ]);

  // ── Site settings ──────────────────────────────────────
  await db
    .insert(siteSettings)
    .values([
      { key: 'featured_limit', value: 8 },
      { key: 'auto_approve_jobs', value: false },
    ])
    .onConflictDoNothing();

  console.log(
    `✅ Seed complete: ${jobRows.length} jobs, ${waRows.length} WhatsApp groups, ${salaryRows.length} salary reports.`,
  );
  console.log('   Admin:    admin@ddotsmediajobs.com / Admin#12345');
  console.log('   Employer: employer@ddotsmediajobs.com / Employer#123');
  console.log('   Seeker:   seeker@ddotsmediajobs.com / Seeker#12345');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
