/**
 * Additive demo seed for DdotsMediaJobs — SAFE to run against the live DB.
 * Run: pnpm db:seed:demo   (requires DATABASE_URL + a migrated schema)
 *
 * Guarantees:
 *   • NEVER deletes any row.
 *   • Never touches existing users, employers, or applications.
 *   • Only INSERTS, and only when thresholds say data is missing:
 *       - 10 demo jobs (status=active = approved/live) if < 5 active jobs exist
 *       - salary_reports (10 roles × 7 emirates) if the table is empty
 *       - publish blog posts if 0 published exist (insert 20 articles if none at all)
 *   • All inserts use ON CONFLICT DO NOTHING.
 * Idempotent: re-running once data exists is a no-op.
 *
 * NOTE: the job status enum has no 'approved' value — 'active' IS the
 * approved/live state queried by the public site.
 */
import bcrypt from 'bcryptjs';
import { db, eq, count, users, jobs, salaryReports, blogPosts } from './index';
import { BLOG_ARTICLES, renderArticle } from './blog-seed';
import { EMIRATES, slugify } from '@ddots/shared';

// Realistic UAE 2026 monthly base pay (AED), scaled per emirate to give the
// salary guide a believable min/avg/max spread.
const SALARY_ROLES = [
  { title: 'Driver', category: 'driving', base: 3500 },
  { title: 'Registered Nurse', category: 'healthcare', base: 7500 },
  { title: 'Accountant', category: 'finance', base: 6500 },
  { title: 'Receptionist', category: 'admin', base: 4200 },
  { title: 'IT Engineer', category: 'it', base: 11000 },
  { title: 'Sales Executive', category: 'sales', base: 5500 },
  { title: 'HR Manager', category: 'admin', base: 16000 },
  { title: 'Teacher', category: 'education', base: 8500 },
  { title: 'Security Guard', category: 'security', base: 3000 },
  { title: 'Chef', category: 'hospitality', base: 6500 },
] as const;

const EMIRATE_FACTOR: Record<string, number> = {
  dubai: 1.1,
  'abu-dhabi': 1.12,
  sharjah: 0.96,
  ajman: 0.9,
  'ras-al-khaimah': 0.92,
  fujairah: 0.9,
  'umm-al-quwain': 0.88,
};

const DEMO_JOBS = [
  { title: 'Light Vehicle Driver', category: 'driving', emirate: 'dubai', exp: 'junior', min: 3000, max: 4000,
    desc: 'A growing logistics company in Dubai is hiring a Light Vehicle Driver for daily deliveries across the emirate. You will plan efficient routes, maintain the vehicle, keep delivery records, and provide courteous service to customers. A valid UAE manual driving licence and good knowledge of Dubai roads are required.' },
  { title: 'Registered Nurse', category: 'healthcare', emirate: 'abu-dhabi', exp: '3-5-years', min: 7000, max: 9000,
    desc: 'A private hospital in Abu Dhabi seeks a Registered Nurse for its inpatient department. Responsibilities include patient assessment, administering medication, supporting doctors during procedures, and maintaining accurate records. A valid DOH / HAAD licence and at least three years of clinical experience are required.' },
  { title: 'Senior Accountant', category: 'finance', emirate: 'dubai', exp: '3-5-years', min: 6000, max: 9000,
    desc: 'An established trading group in Dubai is looking for a Senior Accountant to manage month-end closing, VAT filing, accounts payable and receivable, and financial reporting. Strong Excel skills and hands-on experience with ERP systems are essential. UAE VAT knowledge is a must.' },
  { title: 'Front Desk Receptionist', category: 'admin', emirate: 'sharjah', exp: '1-3-years', min: 3500, max: 4500,
    desc: 'A busy clinic in Sharjah requires a Front Desk Receptionist to greet visitors, manage appointments, handle phone and email enquiries, and support general office administration. Excellent communication skills in English are required; Arabic is an advantage.' },
  { title: 'Full-Stack Software Engineer', category: 'it', emirate: 'dubai', exp: '3-5-years', min: 12000, max: 18000,
    desc: 'A fast-scaling technology startup in Dubai is hiring a Full-Stack Software Engineer to build and maintain web applications using React, Node.js and PostgreSQL. You will own features end to end, write clean tested code, and collaborate closely with product and design. Experience with cloud deployment is preferred.' },
  { title: 'Sales Executive', category: 'sales', emirate: 'dubai', exp: '1-3-years', min: 4000, max: 6000,
    desc: 'A consumer goods distributor in Dubai is hiring a Sales Executive to develop new business, manage existing accounts, and meet monthly targets. The role offers a competitive base salary plus commission. A UAE driving licence and strong negotiation skills are required.' },
  { title: 'HR Manager', category: 'admin', emirate: 'abu-dhabi', exp: '5-10-years', min: 14000, max: 20000,
    desc: 'A mid-sized company in Abu Dhabi seeks an experienced HR Manager to lead recruitment, employee relations, payroll oversight, and UAE labour-law compliance. You will shape HR policy and partner with department heads. At least five years of UAE HR experience is required.' },
  { title: 'Primary School Teacher', category: 'education', emirate: 'sharjah', exp: '3-5-years', min: 7000, max: 11000,
    desc: 'An international school in Sharjah is recruiting a Primary School Teacher to deliver engaging lessons aligned with the British curriculum, assess pupil progress, and support pastoral care. A relevant teaching qualification and prior classroom experience are required.' },
  { title: 'Security Guard', category: 'security', emirate: 'dubai', exp: 'fresher', min: 2500, max: 3500,
    desc: 'A facilities management firm in Dubai is hiring Security Guards for residential and commercial sites. Duties include access control, patrolling, incident reporting, and ensuring the safety of residents and visitors. A valid SIRA card is an advantage; freshers are welcome to apply.' },
  { title: 'Head Chef', category: 'hospitality', emirate: 'dubai', exp: '5-10-years', min: 8000, max: 12000,
    desc: 'A premium restaurant in Dubai is looking for a Head Chef to lead the kitchen, design seasonal menus, control food cost, and maintain the highest hygiene standards. Proven leadership in a high-volume kitchen and strong knowledge of international cuisine are required.' },
  { title: 'Warehouse Associate', category: 'driving', emirate: 'sharjah', exp: 'junior', min: 2800, max: 3800,
    desc: 'A distribution centre in Sharjah is hiring a Warehouse Associate to receive, store, pick and pack goods, operate basic equipment, and keep accurate stock records. Physical fitness and attention to detail are required. Forklift certification is an advantage.' },
] as const;

async function main() {
  console.log('🌱 Demo seed (additive, non-destructive)…');

  // ── Actor: reuse an existing employer/admin; never modify existing users ──
  let actor =
    (await db.query.users.findFirst({ where: eq(users.role, 'employer') })) ??
    (await db.query.users.findFirst({ where: eq(users.role, 'admin') }));
  if (!actor) {
    [actor] = await db
      .insert(users)
      .values({
        name: 'Demo Employer',
        email: 'demo-employer@ddotsmediajobs.com',
        passwordHash: await bcrypt.hash('Employer#123', 10),
        role: 'employer',
        emailVerified: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    if (!actor) actor = await db.query.users.findFirst({ where: eq(users.email, 'demo-employer@ddotsmediajobs.com') });
  }
  const actorId = actor!.id;

  // ── 1. Jobs: insert 10 demo jobs only if < 5 active (approved/live) jobs ──
  const activeJobs = Number(
    (await db.select({ n: count() }).from(jobs).where(eq(jobs.status, 'active')))[0]?.n ?? 0,
  );
  if (activeJobs < 5) {
    const jobRows = DEMO_JOBS.map((j) => ({
      slug: `${slugify(j.title)}-${j.emirate}-demo`,
      employerId: actorId,
      title: j.title,
      description: j.desc,
      categorySlug: j.category,
      emirateSlug: j.emirate,
      location: `${EMIRATES.find((e) => e.slug === j.emirate)?.name ?? j.emirate}, UAE`,
      jobType: 'full-time' as const,
      experienceLevel: j.exp,
      visaStatus: 'any' as const,
      salaryMin: j.min,
      salaryMax: j.max,
      salaryPeriod: 'monthly' as const,
      isFresher: j.exp === 'fresher',
      skills: ['Communication', 'Teamwork'],
      benefits: ['Visa', 'Medical insurance', 'Annual ticket'],
      status: 'active' as const,
      source: 'manual',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    }));
    await db.insert(jobs).values(jobRows).onConflictDoNothing();
    console.log(`   jobs: ${activeJobs} active (< 5) → inserted ${jobRows.length} demo jobs`);
  } else {
    console.log(`   jobs: ${activeJobs} active jobs already (≥ 5) — skipped`);
  }

  // ── 2. Salary reports: insert only if the table is empty ─────────────────
  const salaryTotal = Number((await db.select({ n: count() }).from(salaryReports))[0]?.n ?? 0);
  if (salaryTotal === 0) {
    const salaryRows = SALARY_ROLES.flatMap((r) =>
      EMIRATES.map((e) => ({
        jobTitle: r.title,
        categorySlug: r.category,
        emirateSlug: e.slug,
        experienceLevel: '3-5-years' as const,
        salaryMonthly: Math.round(r.base * (EMIRATE_FACTOR[e.slug] ?? 1)),
        yearsExperience: 4,
        isVerified: true,
      })),
    );
    await db.insert(salaryReports).values(salaryRows).onConflictDoNothing();
    console.log(`   salary: empty → inserted ${salaryRows.length} rows`);
  } else {
    console.log(`   salary: ${salaryTotal} rows already — skipped`);
  }

  // ── 3. Blog: publish only if 0 published posts exist ─────────────────────
  const publishedCount = Number(
    (await db.select({ n: count() }).from(blogPosts).where(eq(blogPosts.isPublished, true)))[0]?.n ?? 0,
  );
  if (publishedCount === 0) {
    const promoted = await db
      .update(blogPosts)
      .set({ isPublished: true, publishedAt: new Date() })
      .where(eq(blogPosts.isPublished, false))
      .returning({ id: blogPosts.id });
    if (promoted.length === 0) {
      // No posts at all — seed the 20 SEO articles, published.
      await db
        .insert(blogPosts)
        .values(
          BLOG_ARTICLES.map((a) => ({
            slug: a.slug,
            title: a.title,
            excerpt: a.excerpt,
            content: renderArticle(a),
            authorId: actorId,
            category: a.category,
            tags: a.tags,
            isPublished: true,
            publishedAt: new Date(),
          })),
        )
        .onConflictDoNothing();
      console.log(`   blog: empty → inserted ${BLOG_ARTICLES.length} published articles`);
    } else {
      console.log(`   blog: published ${promoted.length} draft posts`);
    }
  } else {
    console.log(`   blog: ${publishedCount} published already — skipped`);
  }

  console.log('✅ Demo seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Demo seed failed:', err);
  process.exit(1);
});
