/**
 * Seed job categories + subcategories (parentId-linked).
 * Run: pnpm tsx packages/db/src/seed-categories.ts   (requires DATABASE_URL + migrated schema)
 *
 * Idempotent: ON CONFLICT (slug) DO NOTHING — never overwrites existing rows.
 */
import { db } from './index';
import { jobCategories } from './schema';
import { slugify } from '@ddots/shared';

type Main = { name: string; slug: string; icon: string; subs: string[] };

const CATS: Main[] = [
  { name: 'Driving & Logistics', slug: 'driving', icon: '🚗', subs: ['Heavy Vehicle Driver', 'Light Vehicle Driver', 'Delivery Driver', 'Forklift Operator', 'Courier', 'Chauffeur', 'Tanker Driver', 'Bus Driver'] },
  { name: 'Healthcare', slug: 'healthcare', icon: '🏥', subs: ['Nurse', 'Doctor', 'Pharmacist', 'Dentist', 'Lab Technician', 'Physiotherapist', 'Radiologist', 'Medical Secretary', 'Healthcare Assistant', 'Optician'] },
  { name: 'Finance & Accounting', slug: 'finance', icon: '💰', subs: ['Accountant', 'Auditor', 'Tax Consultant', 'Financial Analyst', 'Bookkeeper', 'VAT Specialist', 'Investment Advisor', 'Payroll Officer'] },
  { name: 'IT & Software', slug: 'it', icon: '💻', subs: ['Software Developer', 'Web Developer', 'Mobile App Developer', 'IT Support', 'Network Engineer', 'Cybersecurity', 'Data Analyst', 'DevOps', 'UI/UX Designer', 'Database Administrator'] },
  { name: 'Hospitality & Tourism', slug: 'hospitality', icon: '🍽️', subs: ['Chef', 'Cook', 'Waiter', 'Receptionist', 'Hotel Manager', 'Housekeeping', 'Barista', 'Food & Beverage', 'Tour Guide', 'Event Coordinator'] },
  { name: 'Construction', slug: 'construction', icon: '🏗️', subs: ['Civil Engineer', 'Architect', 'Electrician', 'Plumber', 'Carpenter', 'Mason', 'Welder', 'Painter', 'Site Engineer', 'Interior Designer', 'Quantity Surveyor'] },
  { name: 'Education', slug: 'education', icon: '📚', subs: ['Teacher', 'Tutor', 'Principal', 'Lecturer', 'Teaching Assistant', 'Trainer', 'Curriculum Developer', 'School Counselor', 'Special Education'] },
  { name: 'Sales & Marketing', slug: 'sales', icon: '💼', subs: ['Sales Executive', 'Marketing Manager', 'Digital Marketing', 'Social Media', 'Business Development', 'Tele-caller', 'Retail Sales', 'Brand Manager'] },
  { name: 'Admin & Office', slug: 'admin', icon: '📋', subs: ['Receptionist', 'Secretary', 'Data Entry', 'Office Manager', 'Coordinator', 'Personal Assistant', 'Customer Service', 'Call Center'] },
  { name: 'Security & Safety', slug: 'security', icon: '🛡️', subs: ['Security Guard', 'CCTV Operator', 'Safety Officer', 'Fire Fighter', 'Loss Prevention'] },
  { name: 'Manufacturing', slug: 'manufacturing', icon: '🏭', subs: ['Production Operator', 'Quality Control', 'Machine Operator', 'Technician', 'Supervisor', 'Packer', 'Assembly Worker'] },
  { name: 'Beauty & Wellness', slug: 'beauty', icon: '💄', subs: ['Hair Stylist', 'Makeup Artist', 'Beautician', 'Massage Therapist', 'Nail Technician', 'Spa Manager'] },
  { name: 'HR & Recruitment', slug: 'hr', icon: '👥', subs: ['HR Manager', 'Recruiter', 'Talent Acquisition', 'Training & Development', 'Compensation & Benefits'] },
  { name: 'Legal & Compliance', slug: 'legal', icon: '⚖️', subs: ['Lawyer', 'Legal Advisor', 'Compliance Officer', 'Paralegal', 'Company Secretary'] },
  { name: 'Real Estate', slug: 'real-estate', icon: '🏠', subs: ['Property Agent', 'Leasing Consultant', 'Property Manager', 'Valuer', 'Real Estate Developer'] },
  { name: 'Engineering', slug: 'engineering', icon: '⚙️', subs: ['Mechanical Engineer', 'Electrical Engineer', 'Chemical Engineer', 'Structural Engineer', 'Project Engineer', 'Maintenance Engineer'] },
  { name: 'Media & Creative', slug: 'media', icon: '🎨', subs: ['Graphic Designer', 'Video Editor', 'Photographer', 'Content Creator', 'Journalist', 'Copywriter', 'Animator', 'Social Media Creator'] },
  { name: 'Domestic & Household', slug: 'domestic', icon: '🏡', subs: ['Nanny', 'Housekeeper', 'Cook', 'Driver', 'Gardener', 'Caregiver', 'Baby Sitter'] },
  { name: 'Food & Beverage', slug: 'food-beverage', icon: '🍕', subs: ['Restaurant Manager', 'Pastry Chef', 'Bartender', 'Cashier', 'Kitchen Helper', 'Baker'] },
];

async function main() {
  console.log('🌱 Seeding job categories…');
  let mains = 0;
  let subs = 0;

  // 1) main categories (ON CONFLICT slug DO NOTHING)
  await db
    .insert(jobCategories)
    .values(CATS.map((c, i) => ({ slug: c.slug, name: c.name, icon: c.icon, parentId: null, sortOrder: i, isActive: true })))
    .onConflictDoNothing();

  // 2) resolve parent ids by slug, then insert subs
  const rows = await db.query.jobCategories.findMany();
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));

  for (const c of CATS) {
    const parentId = idBySlug.get(c.slug);
    if (!parentId) continue;
    mains++;
    const values = c.subs.map((name, i) => ({
      slug: slugify(`${c.slug}-${name}`),
      name,
      icon: c.icon,
      parentId,
      sortOrder: i,
      isActive: true,
    }));
    if (values.length) {
      await db.insert(jobCategories).values(values).onConflictDoNothing();
      subs += values.length;
    }
  }

  console.log(`✅ Categories seed complete: ${mains} main, ${subs} sub (existing rows untouched).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Category seed failed:', err);
  process.exit(1);
});
