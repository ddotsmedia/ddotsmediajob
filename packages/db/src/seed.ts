/**
 * Database seed for DdotsMediaJobs.
 * Run: pnpm db:seed   (requires DATABASE_URL + a migrated schema)
 *
 * Idempotent: clears domain tables then re-inserts deterministic demo data.
 */
import bcrypt from 'bcryptjs';
import { db } from './index';
import { BLOG_ARTICLES, renderArticle } from './blog-seed';
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
  skillAssessments,
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

  // ── Blog (20 SEO articles) ─────────────────────────────
  await db.insert(blogPosts).values(
    BLOG_ARTICLES.map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      content: renderArticle(a),
      authorId: admin!.id,
      category: a.category,
      tags: a.tags,
      isPublished: true,
      publishedAt: new Date(),
    })),
  );

  // ── Skill assessments ──────────────────────────────────
  await db.insert(skillAssessments).values([
    {
      slug: 'excel-fundamentals', title: 'Excel Fundamentals', categorySlug: 'admin',
      description: 'Core spreadsheet skills every UAE office role needs.', badgeName: 'Excel Verified', badgeColor: '#2a9aa4', timeLimitSec: 60, passScore: 70,
      questions: [
        { q: 'Which symbol starts a formula in Excel?', options: ['#', '=', '+', '@'], correct: 1 },
        { q: 'Which function adds a range of cells?', options: ['SUM', 'COUNT', 'AVERAGE', 'MAX'], correct: 0 },
        { q: 'What does VLOOKUP do?', options: ['Sorts data', 'Looks up a value in a column', 'Deletes rows', 'Formats cells'], correct: 1 },
        { q: 'How do you lock a cell reference?', options: ['Use $ signs', 'Use brackets', 'Use quotes', 'Use %'], correct: 0 },
        { q: 'Which chart shows parts of a whole?', options: ['Line', 'Pie', 'Scatter', 'Histogram'], correct: 1 },
      ],
    },
    {
      slug: 'customer-service-basics', title: 'Customer Service Basics', categorySlug: 'hospitality',
      description: 'Service essentials for UAE hospitality and retail.', badgeName: 'Service Pro', badgeColor: '#ea7a3c', timeLimitSec: 60, passScore: 70,
      questions: [
        { q: 'A guest complains. Your first step?', options: ['Argue', 'Listen and empathise', 'Ignore', 'Walk away'], correct: 1 },
        { q: 'Best way to greet a guest?', options: ['Say nothing', 'Warm, professional greeting', 'Look at phone', 'Point silently'], correct: 1 },
        { q: 'What is upselling?', options: ['Refusing service', 'Recommending relevant add-ons', 'Raising prices secretly', 'Closing early'], correct: 1 },
        { q: 'Handling a dietary request?', options: ['Guess', 'Confirm details and accommodate', 'Refuse', 'Charge extra'], correct: 1 },
        { q: 'After resolving a complaint?', options: ['Forget it', 'Follow up to ensure satisfaction', 'Tell other guests', 'Take a break'], correct: 1 },
      ],
    },
    {
      slug: 'javascript-basics', title: 'JavaScript Basics', categorySlug: 'it',
      description: 'Fundamental JavaScript knowledge for developer roles.', badgeName: 'JS Verified', badgeColor: '#f4cf3f', timeLimitSec: 60, passScore: 70,
      questions: [
        { q: 'Which keyword declares a block-scoped variable?', options: ['var', 'let', 'function', 'global'], correct: 1 },
        { q: 'What does === check?', options: ['Value only', 'Value and type', 'Type only', 'Reference only'], correct: 1 },
        { q: 'Which is an array method?', options: ['map', 'toUpper', 'select', 'fetchAll'], correct: 0 },
        { q: 'What is a Promise used for?', options: ['Styling', 'Async operations', 'Loops', 'Comments'], correct: 1 },
        { q: 'How do you write an arrow function?', options: ['=> ', 'fn()', '::', '->'], correct: 0 },
      ],
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
