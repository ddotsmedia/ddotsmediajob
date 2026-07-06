/**
 * Seed DdotsMedia WhatsApp groups into whatsapp_groups.
 * Run: (env sourced) npx tsx packages/db/src/seed-whatsapp-groups.ts
 * Idempotent: ON CONFLICT (slug) DO NOTHING — existing rows untouched.
 */
import { db } from './index';
import { whatsappGroups } from './schema';
import { slugify } from '@ddots/shared';

const JOIN_LINK = 'https://wa.me/971509379212';

const GROUPS: { name: string; category: string }[] = [
  // general
  ...['DDotsMedia Jobs', 'UAE DDotsMedia Jobs', 'Ddotsmedia UAE Jobs', 'DDOTSMEDIA UAE Jobs', 'Ddotsmedia Jobs Entry', 'Ddotsmedia Job Posts', 'Ddotsmedia Coordination'].map((name) => ({ name, category: 'general' })),
  // location
  ...['DDOTSMEDIA Jobs Ajman', 'DDotsmedia Jobs Abudhabi', 'DDotsMedia Abudhabi Driver Jobs', 'DDots Media Jobs Dubai', 'DDotsMedia Dubai Malayalees', 'DDotsmedia Jobs Sharja', 'DDotsMedia Jobs Kerala'].map((name) => ({ name, category: 'location' })),
  // medical
  ...['DDotsMedia Doctors UAE', 'DDotsMedia Pharmacists UAE', 'DDotsMedia Nurses Jobs UAE', 'DDotsMedia Medical Job UAE', 'DDotsMedia Medical & Paramedical', 'DDOTSMEDIA Medical Coders', 'DDOTSMEDIA Hospital Management', 'Ddotsmedia Biomedical Engineering', 'DDotsMedia MLT/OT/PT/OD/Radiology'].map((name) => ({ name, category: 'medical' })),
  // it
  ...['DDotsMedia Data Analyst Job', 'Ddotsmedia IT Jobs UAE'].map((name) => ({ name, category: 'it' })),
  // engineering
  ...['Ddotsmedia Engineering Jobs', 'DDots Media UAE Engineering'].map((name) => ({ name, category: 'engineering' })),
  // accounts
  ...['DDotsmedia Accounts Jobs', 'DDotsMedia Accounts Vacancies', 'Accounts DDotsmedia Jobs'].map((name) => ({ name, category: 'accounts' })),
  // hr
  ...['DDotsmedia HR & Administration', 'DDotsMedia HR Jobs', 'Ddotsmedia Administration Jobs', 'Ddotsmedia Operations Jobs'].map((name) => ({ name, category: 'hr' })),
  // sales
  ...['Ddotsmedia Sales & Marketing', 'DDOTSMEDIA Graphic Design'].map((name) => ({ name, category: 'sales' })),
  // teaching
  ...['DDots Media UAE Teachers', 'DDotsMedia UAE Teachers', 'DDots Media INDIA Teachers'].map((name) => ({ name, category: 'teaching' })),
  // logistics
  ...['DDotsMedia Driver Job Dubai', 'DDots Media Driver Job UAE', 'DDOTSMEDIA Logistics Jobs', 'DDotsMedia Automobile Jobs'].map((name) => ({ name, category: 'logistics' })),
  // specialized
  ...['DDotsMedia HSE Job', 'DDotsMedia Procurement Job', 'DDotsmedia Electrician/Offshore', 'DdotsMedia Document Control', 'DDOTSMEDIA Restaurant & Supermarket', 'DDOTSMEDIA Travels & Typing', 'DDotsMedia Ladies Jobs UAE', 'DDotsMedia Housemaid Job UAE', 'DDotsMedia Housemaids UAE'].map((name) => ({ name, category: 'specialized' })),
  // community
  ...['DDotsMedia UAE Malayalees', 'DDots Media UAE Jobs Malayalam', 'DDotsmedia Jobs Indian Numbers'].map((name) => ({ name, category: 'community' })),
];

async function main() {
  const seen = new Set<string>();
  const values: (typeof whatsappGroups.$inferInsert)[] = [];
  for (const g of GROUPS) {
    const slug = slugify(g.name);
    if (seen.has(slug)) continue;
    seen.add(slug);
    values.push({ name: g.name, inviteUrl: JOIN_LINK, categorySlug: g.category, slug, isActive: true });
  }
  await db.insert(whatsappGroups).values(values).onConflictDoNothing();
  console.log(`✅ WhatsApp groups seed complete: ${values.length} groups (existing rows untouched).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ WhatsApp groups seed failed:', err);
  process.exit(1);
});
