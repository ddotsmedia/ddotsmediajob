/**
 * Non-destructive seed for GoCareer features: gcc_countries, career_tips, walk-in jobs.
 * Run: pnpm --filter @ddots/db exec tsx src/seed-gocareer.ts   (requires DATABASE_URL + migrated schema)
 * Idempotent: uses onConflictDoNothing — safe to re-run, never wipes existing data.
 */
import { db } from './index';
import { gccCountries, careerTips, jobs, users, companies } from './schema';
import { eq } from 'drizzle-orm';
import { slugify } from '@ddots/shared';

const GCC = [
  { slug: 'uae', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED' },
  { slug: 'saudi-arabia', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR' },
  { slug: 'qatar', name: 'Qatar', flag: '🇶🇦', currency: 'QAR' },
  { slug: 'kuwait', name: 'Kuwait', flag: '🇰🇼', currency: 'KWD' },
  { slug: 'oman', name: 'Oman', flag: '🇴🇲', currency: 'OMR' },
  { slug: 'bahrain', name: 'Bahrain', flag: '🇧🇭', currency: 'BHD' },
];

const TIPS = [
  { category: 'resume', title: 'Tailor your CV for every role', body: 'Recruiters spend under 30 seconds on first scan. Mirror the job posting keywords exactly to pass ATS filters and stand out.', icon: '📄', sortOrder: 1 },
  { category: 'interview', title: 'Research the company before any interview', body: 'Reference one specific company detail in your answers — mention a recent project, award, or news item. Interviewers always notice.', icon: '🎯', sortOrder: 2 },
  { category: 'job_search', title: 'Follow up the right way after applying', body: 'Send a polite follow-up email 5–7 days after applying. Keep it to 3 sentences. Shows initiative and keeps you top of mind.', icon: '📬', sortOrder: 3 },
  { category: 'salary', title: 'Know your market rate before negotiating', body: 'Research salary ranges on our Salary Guide before any offer discussion. Candidates who know their worth negotiate 15–20% higher on average.', icon: '💰', sortOrder: 4 },
  { category: 'visa', title: 'Apply to visa-sponsored jobs first', body: 'Filter for "Visa Provided" jobs to fast-track your UAE move. Many employers cover visa + medical + Emirates ID costs.', icon: '✈️', sortOrder: 5 },
  { category: 'interview', title: 'Dress one level above the role', body: 'In UAE corporate culture, appearance matters. Business formal is safe for most roles even if the company is casual internally.', icon: '👔', sortOrder: 6 },
];

function dayAfter(base: Date, weekday: number, weeksAhead = 0): string {
  const d = new Date(base);
  const diff = (weekday - d.getDay() + 7) % 7 || 7; // next occurrence (not today)
  d.setDate(d.getDate() + diff + weeksAhead * 7);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const now = new Date();
  const MON = dayAfter(now, 1), TUE = dayAfter(now, 2), WED = dayAfter(now, 3), THU = dayAfter(now, 4), FRI = dayAfter(now, 5), SAT = dayAfter(now, 6);

  console.log('🌍 gcc_countries…');
  for (const c of GCC) await db.insert(gccCountries).values(c).onConflictDoNothing({ target: gccCountries.slug });

  console.log('💡 career_tips…');
  const existingTips = await db.select({ id: careerTips.id }).from(careerTips).limit(1);
  if (existingTips.length === 0) await db.insert(careerTips).values(TIPS);

  console.log('🚶 walk-in jobs…');
  const admin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
  if (!admin) { console.error('No admin user — skip walk-ins'); return; }

  const WALKINS = [
    { title: 'Registered Nurse', company: 'Aster DM Healthcare', emirate: 'dubai', cat: 'healthcare', min: 6000, max: 9000, date: MON, time: '9:00 AM – 5:00 PM', venue: 'Aster Hospital, Al Qusais, Dubai', last: FRI, featured: true },
    { title: 'Sales Executive', company: 'Landmark Group', emirate: 'dubai', cat: 'sales', min: 4000, max: 6000, date: TUE, time: '10:00 AM – 4:00 PM', venue: 'Landmark Group HQ, Jebel Ali Free Zone, Dubai', last: SAT },
    { title: 'Heavy Vehicle Driver', company: 'Al Futtaim Logistics', emirate: 'dubai', cat: 'driving', min: 3000, max: 4000, date: WED, time: '8:00 AM – 12:00 PM', venue: 'Al Futtaim Motors, Festival City, Dubai', last: THU },
    { title: 'Hotel Receptionist', company: 'Rotana Hotels', emirate: 'abu-dhabi', cat: 'hospitality', min: 3500, max: 5000, date: MON, time: '10:00 AM – 3:00 PM', venue: 'Khalidiyah Palace Rotana, Abu Dhabi Corniche', last: WED },
    { title: 'Accountant', company: 'KPMG Lower Gulf', emirate: 'dubai', cat: 'finance', min: 8000, max: 12000, date: THU, time: '9:00 AM – 1:00 PM', venue: 'KPMG Office, Emirates Financial Towers, DIFC Dubai', last: THU, urgent: true },
    { title: 'IT Support Engineer', company: 'du Telecom', emirate: 'dubai', cat: 'it', min: 7000, max: 10000, date: FRI, time: '10:00 AM – 4:00 PM', venue: 'du HQ, Dubai Internet City', last: FRI },
    { title: 'Security Guard', company: 'G4S UAE', emirate: 'sharjah', cat: 'security', min: 2500, max: 3000, date: TUE, time: '8:00 AM – 12:00 PM', venue: 'G4S Sharjah Branch, Industrial Area 1', last: SAT, visa: true, accom: true },
    { title: 'Primary School Teacher', company: 'GEMS Education', emirate: 'dubai', cat: 'education', min: 8000, max: 12000, date: WED, time: '9:00 AM – 3:00 PM', venue: 'GEMS Wellington Academy, Al Khail, Dubai', last: FRI },
  ];

  let inserted = 0;
  for (const w of WALKINS) {
    const slug = `${slugify(w.title)}-${slugify(w.company)}-walkin`;
    const coSlug = slugify(w.company);
    let companyId: string | null = (await db.query.companies.findFirst({ where: eq(companies.slug, coSlug) }))?.id ?? null;
    if (!companyId) companyId = (await db.insert(companies).values({ slug: coSlug, name: w.company, industry: 'General' }).returning())[0]?.id ?? null;

    const res = await db.insert(jobs).values({
      slug, employerId: admin.id, companyId, title: w.title,
      description: `${w.company} is conducting a walk-in interview for ${w.title}. Bring an updated CV and relevant documents. No prior appointment needed.`,
      categorySlug: w.cat, emirateSlug: w.emirate, jobType: 'full-time' as never, experienceLevel: '1-3-years' as never,
      salaryMin: w.min, salaryMax: w.max, visaProvided: !!w.visa, accommodationProvided: !!w.accom, isUrgent: !!w.urgent, isFeatured: !!w.featured,
      walkIn: true, walkInDate: w.date, walkInTime: w.time, walkInVenue: w.venue, walkInLastDate: w.last,
      status: 'active', source: 'manual', publishedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86_400_000),
    }).onConflictDoNothing({ target: jobs.slug }).returning();
    if (res.length) inserted++;
  }
  console.log(`✅ Done. Walk-ins inserted: ${inserted}/${WALKINS.length} (rest already existed).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
