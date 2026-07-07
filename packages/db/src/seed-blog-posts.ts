/**
 * Seed 5 SEO blog posts targeting high-volume UAE job keywords.
 * Run: (env sourced) npx tsx packages/db/src/seed-blog-posts.ts
 * Idempotent: ON CONFLICT (slug) DO NOTHING.
 */
import { db } from './index';
import { blogPosts } from './schema';

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  faqs: { q: string; a: string }[];
  content: string;
};

const CTA = `
<h2>Start applying today</h2>
<p>New UAE vacancies are posted every day. <a href="/jobs">Browse all live jobs</a> and apply free in one click, or
<a href="/whatsapp-groups">join our WhatsApp job groups</a> to get matching roles sent straight to your phone.</p>`;

const POSTS: Post[] = [
  {
    slug: 'how-to-find-nursing-jobs-uae-2026',
    title: 'How to Find Nursing Jobs in UAE as a Foreign-Trained Nurse (2026 Guide)',
    excerpt: 'A step-by-step 2026 guide for foreign-trained nurses: DHA, MOH and HAAD licensing, where to apply, salaries and how to land your first UAE nursing job.',
    category: 'Career Guides',
    tags: ['DHA exam', 'MOH license', 'HAAD', 'nursing jobs UAE', 'nurse salary UAE'],
    faqs: [
      { q: 'Do I need a DHA or MOH licence to work as a nurse in the UAE?', a: 'Yes. You must be licensed by the health authority of the emirate you work in — DHA (Dubai), MOH (northern emirates), or DOH/HAAD (Abu Dhabi). Employers usually help sponsor and process the licence.' },
      { q: 'What salary can a nurse expect in the UAE?', a: 'Staff nurse salaries typically range from AED 4,000 to AED 9,000 per month depending on the emirate, specialty and experience, often with accommodation, transport and medical insurance.' },
    ],
    content: `
<p>The UAE has one of the fastest-growing healthcare sectors in the Gulf, and demand for qualified nurses is high across Dubai, Abu Dhabi and Sharjah. If you trained abroad, the path is very achievable — you just need the right licence and to apply in the right places. This 2026 guide walks you through it.</p>

<h2>Step 1: Understand the licensing bodies</h2>
<p>Every nurse in the UAE must be licensed by a health authority. Which one depends on where you work:</p>
<ul>
<li><strong>DHA</strong> — Dubai Health Authority, for jobs in Dubai.</li>
<li><strong>DOH (formerly HAAD)</strong> — Department of Health, for Abu Dhabi.</li>
<li><strong>MOH</strong> — Ministry of Health, covering Sharjah, Ajman and the northern emirates.</li>
</ul>
<p>Each authority requires you to pass a licensing exam, verify your qualifications (usually through DataFlow primary source verification) and hold a minimum of two years' clinical experience.</p>

<h3>The licensing exam</h3>
<p>The DHA, MOH and DOH exams are computer-based and test core clinical knowledge. Many nurses prepare using Prometric-style question banks. Once you pass and your documents are verified, you receive an eligibility letter that lets employers process your work permit.</p>

<h2>Step 2: Prepare your documents</h2>
<p>Have these ready before you apply — it speeds everything up:</p>
<ul>
<li>Nursing degree/diploma and transcripts</li>
<li>Valid nursing licence from your home country</li>
<li>Experience/employment certificates</li>
<li>Passport and passport-size photos</li>
<li>DataFlow verification report (once completed)</li>
</ul>

<h2>Step 3: Where to find nursing jobs</h2>
<p>Hospitals, clinics, home-care providers and medical centres hire continuously. The fastest way to see live openings is to browse role-specific pages such as <a href="/jobs/nurse-jobs-uae">nurse jobs in the UAE</a> or <a href="/jobs/nurse-jobs-in-dubai">nurse jobs in Dubai</a>, which update daily with salary and visa details.</p>
<p>Many employers also recruit through WhatsApp. Joining a medical jobs group means new nursing vacancies reach you the moment they are posted.</p>

<h2>Step 4: Understand the salary and benefits</h2>
<p>Staff nurse pay usually falls between AED 4,000 and AED 9,000 per month, with specialised roles (ICU, ER, theatre) paying more. Most packages include an employment visa, medical insurance, annual flight and often accommodation or a housing allowance — so your take-home value is higher than the base figure suggests.</p>

<h2>Step 5: Apply and interview</h2>
<p>Tailor your CV to highlight your specialty, licence status and years of experience. Be ready for a short clinical interview, sometimes online. Employers value nurses who are already DataFlow-verified or exam-eligible, so mention your licensing progress up front.</p>
${CTA}`,
  },
  {
    slug: 'driver-jobs-dubai-2026',
    title: 'Top 10 Driver Jobs in Dubai 2026 — Salary, Requirements & How to Apply',
    excerpt: 'The 10 most in-demand driver jobs in Dubai for 2026, with salaries, licence requirements and how to apply free via WhatsApp.',
    category: 'Career Guides',
    tags: ['driver jobs Dubai', 'light vehicle driver', 'heavy vehicle driver', 'driver salary Dubai'],
    faqs: [
      { q: 'What licence do I need to drive in Dubai?', a: 'You need a valid UAE driving licence for the vehicle class you drive. Many employers help convert an eligible home-country licence or sponsor the training.' },
      { q: 'How much do drivers earn in Dubai?', a: 'Light vehicle drivers typically earn AED 2,500–4,500 and heavy/bus drivers AED 3,500–6,000 per month, usually with accommodation, visa and overtime.' },
    ],
    content: `
<p>Driving is one of the most reliable ways to start earning in Dubai. Demand is steady across delivery, logistics, passenger transport and private roles, and many jobs include accommodation and a visa. Here are the top 10 driver roles for 2026 and what they pay.</p>

<h2>The 10 most in-demand driver jobs</h2>
<ul>
<li><strong>Light vehicle driver</strong> — AED 2,500–4,000/month</li>
<li><strong>Heavy vehicle / truck driver</strong> — AED 3,500–6,000/month</li>
<li><strong>Bus driver</strong> — AED 3,500–5,500/month</li>
<li><strong>Delivery driver (food & parcels)</strong> — AED 3,000–5,000/month plus incentives</li>
<li><strong>Company / private driver</strong> — AED 2,500–4,500/month</li>
<li><strong>School bus driver</strong> — AED 3,000–4,500/month</li>
<li><strong>Forklift operator</strong> — AED 2,500–4,000/month</li>
<li><strong>Tanker driver</strong> — AED 4,000–7,000/month</li>
<li><strong>Recovery / tow driver</strong> — AED 3,000–5,000/month</li>
<li><strong>Chauffeur / limousine driver</strong> — AED 3,500–6,000/month plus tips</li>
</ul>

<h2>Requirements</h2>
<p>The core requirement is a valid UAE driving licence for your vehicle class. For heavy vehicles and buses you need the relevant heavy licence. Employers also look for:</p>
<ul>
<li>Good knowledge of Dubai roads and navigation apps</li>
<li>A clean driving record</li>
<li>Basic English or Arabic for communication</li>
<li>Physical fitness for loading/unloading in some roles</li>
</ul>

<h3>Converting your licence</h3>
<p>Drivers from many countries can convert their home licence without a full driving test. If yours is not eligible, employers often sponsor training and testing, especially for heavy and bus categories.</p>

<h2>Where to find driver jobs</h2>
<p>See live openings on our <a href="/jobs/driver-jobs-in-dubai">driver jobs in Dubai</a> page, or if you hold a heavy licence, <a href="/jobs/heavy-driver-jobs-uae">heavy driver jobs in the UAE</a>. New roles are added daily with salary and accommodation details.</p>

<h2>How to apply</h2>
<p>Keep a simple CV listing your licence class, years of driving experience and the emirates you know well. Many driver roles are filled fast through WhatsApp, so responding quickly makes a real difference.</p>
${CTA}`,
  },
  {
    slug: 'walk-in-interviews-uae-guide',
    title: 'Walk-in Interviews in UAE This Week — How to Prepare & What to Bring',
    excerpt: 'Everything you need to ace a UAE walk-in interview: what to bring, how to dress, common questions and how to find walk-ins in Dubai and Abu Dhabi this week.',
    category: 'Career Guides',
    tags: ['walk in interview UAE', 'walk in interview Dubai', 'walk in interview Abu Dhabi'],
    faqs: [
      { q: 'What should I bring to a walk-in interview in the UAE?', a: 'Bring several printed CVs, your passport and visa copy, passport photos, and copies of your certificates and experience letters. Carry originals for verification.' },
      { q: 'How do I find walk-in interviews this week?', a: 'Check our walk-in interviews page and WhatsApp groups daily — venues, dates and timings are posted as employers announce them.' },
    ],
    content: `
<p>Walk-in interviews are one of the quickest ways to get hired in the UAE. Instead of waiting for a callback, you meet the employer face to face and often get a decision the same day. Here is how to prepare and win.</p>

<h2>What to bring</h2>
<ul>
<li><strong>Multiple printed CVs</strong> — bring at least 3–5 clean copies</li>
<li><strong>Passport and visa copy</strong> (plus originals)</li>
<li><strong>Passport-size photos</strong> — 2 to 4</li>
<li><strong>Educational certificates and experience letters</strong></li>
<li><strong>Any licences or trade certificates</strong> relevant to the role</li>
</ul>
<p>Keep everything in a neat folder. Employers notice candidates who are organised.</p>

<h2>How to dress</h2>
<p>Dress one level above the job. For office and sales roles, formal business wear. For technical, hospitality or driving roles, clean, smart and presentable clothing. First impressions are made in seconds.</p>

<h2>Common walk-in interview questions</h2>
<h3>Be ready to answer clearly:</h3>
<ul>
<li>Tell me about yourself and your experience.</li>
<li>Why do you want to work in the UAE?</li>
<li>What is your visa status and notice period?</li>
<li>What salary are you expecting?</li>
</ul>
<p>Keep answers short, confident and honest. Mention your availability — employers filling urgent roles value candidates who can start soon.</p>

<h2>Arrive early and stay patient</h2>
<p>Walk-ins can be busy. Arriving early puts you near the front of the queue and shows commitment. Bring water and be prepared to wait.</p>

<h2>Find walk-ins happening now</h2>
<p>We list live walk-in events with venue, date and timing on our <a href="/jobs/walk-in-interview-dubai">walk-in interviews in Dubai</a> page, updated as employers announce them. Following our WhatsApp groups means you hear about new walk-ins the moment they are posted.</p>
${CTA}`,
  },
  {
    slug: 'uae-labour-law-worker-rights-2026',
    title: 'UAE Labour Law 2026 — Your Rights as a Worker in the UAE',
    excerpt: 'A plain-English guide to UAE labour law in 2026: contracts, working hours, leave, notice periods, end-of-service gratuity and how to protect your rights.',
    category: 'Guides',
    tags: ['UAE labour law', 'worker rights UAE', 'gratuity UAE', 'notice period UAE'],
    faqs: [
      { q: 'How is end-of-service gratuity calculated in the UAE?', a: 'For unlimited service, you earn 21 days basic pay for each of the first five years and 30 days for each year after, based on your last basic salary. Use a gratuity calculator to estimate yours.' },
      { q: 'What is the standard notice period in the UAE?', a: 'Notice periods are set in your contract and are usually 30 days, though they can range from 30 to 90 days. Both employer and employee must honour it.' },
    ],
    content: `
<p>Knowing your rights makes you a safer, more confident worker. UAE labour law — updated under Federal Decree-Law No. 33 — protects employees across the private sector. Here is a clear summary for 2026.</p>

<h2>Your employment contract</h2>
<p>All private-sector employees work under fixed-term contracts registered with MOHRE (the Ministry of Human Resources and Emiratisation). Your contract must state your job title, salary, working hours and benefits. Always keep a copy.</p>

<h2>Working hours and overtime</h2>
<p>The standard work week is 48 hours (8 hours a day, 6 days). Hours are reduced during Ramadan. Work beyond your normal hours should be paid as overtime, typically at 125% of your basic wage, or 150% for late-night hours.</p>

<h2>Leave and holidays</h2>
<ul>
<li><strong>Annual leave</strong> — 30 calendar days per year after one year of service.</li>
<li><strong>Sick leave</strong> — up to 90 days per year, paid on a reducing scale.</li>
<li><strong>Public holidays</strong> — paid days off for official UAE holidays.</li>
<li><strong>Maternity leave</strong> — 60 days, partly paid.</li>
</ul>

<h2>Notice period and ending a contract</h2>
<p>Either party can end the contract by giving the notice stated in it — usually 30 days, sometimes up to 90. You must be paid your salary and dues during the notice period. Arbitrary dismissal entitles you to compensation.</p>

<h2>End-of-service gratuity</h2>
<p>If you complete at least one year, you earn end-of-service gratuity: 21 days of basic pay per year for the first five years, then 30 days per year after. You can estimate yours with our <a href="/wps-calculator">gratuity and WPS calculator</a>.</p>

<h3>Wage protection</h3>
<p>Salaries must be paid through the Wage Protection System (WPS). If your employer does not pay on time, you can file a complaint with MOHRE.</p>

<h2>How to protect yourself</h2>
<p>Read your contract before signing, keep copies of every document, and never hand over your passport — it is your property by law. If a dispute arises, MOHRE offers free mediation.</p>
${CTA}`,
  },
  {
    slug: 'how-to-get-job-dubai-from-india-philippines',
    title: 'How to Get a Job in Dubai from India, Philippines & Pakistan (Step by Step)',
    excerpt: 'A practical step-by-step guide to landing a Dubai job from India, the Philippines or Pakistan — visas, in-demand roles, avoiding scams and where to apply free.',
    category: 'Career Guides',
    tags: ['jobs in Dubai for Indians', 'jobs in Dubai for Filipinos', 'how to get UAE job'],
    faqs: [
      { q: 'Can I get a Dubai job while still in my home country?', a: 'Yes. Many employers hire overseas and sponsor your employment visa. Apply online, interview remotely, and travel once your visa and offer are confirmed.' },
      { q: 'How do I avoid job scams?', a: 'Never pay for a job offer or visa to an agent who guarantees work. Legitimate UAE employers do not charge candidates. Apply through trusted platforms and verify the company.' },
    ],
    content: `
<p>Every year thousands of workers from India, the Philippines and Pakistan build careers in Dubai. The process is straightforward once you know the steps — and you can start while still at home. Here is how.</p>

<h2>Step 1: Pick the right in-demand role</h2>
<p>Focus on sectors that hire overseas workers in volume: healthcare, construction, hospitality, retail, logistics and domestic services. Matching your skills to real demand is the single biggest factor in getting hired.</p>

<h2>Step 2: Prepare a UAE-style CV</h2>
<p>Keep it to two pages, list your experience clearly, and include your visa status (for example, "available to join"). Add a professional photo, which is standard in the Gulf.</p>

<h2>Step 3: Apply from your home country</h2>
<p>You do not need to be in the UAE to start. Many employers hire remotely and sponsor your visa. Explore country-specific pages to see roles that commonly recruit from your region:</p>
<ul>
<li><a href="/jobs/jobs-for-indians-in-uae">Jobs in the UAE for Indians</a></li>
<li><a href="/jobs/jobs-for-filipinos-in-dubai">Jobs in Dubai for Filipinos</a></li>
<li><a href="/jobs/jobs-for-pakistanis-in-uae">Jobs in the UAE for Pakistanis</a></li>
</ul>

<h2>Step 4: Understand the visa process</h2>
<p>Once an employer selects you, they apply for your work permit and employment visa. You complete a medical test and Emirates ID on arrival. A genuine employer covers these visa costs — you should not be asked to pay for your own work visa.</p>

<h3>Avoiding scams</h3>
<p>Never pay an agent who "guarantees" a job or asks for money for a visa. Legitimate UAE employers do not charge candidates. If an offer feels rushed or asks for payment, walk away.</p>

<h2>Step 5: Interview and negotiate</h2>
<p>Most first interviews are online. Be punctual, dress smartly and confirm the full package — salary, accommodation, transport, flights and medical insurance — before you accept.</p>

<h2>Step 6: Stay visible to employers</h2>
<p>New roles open daily. Applying quickly and staying reachable gives you the edge, especially for urgent hiring.</p>
${CTA}`,
  },
];

async function main() {
  const now = new Date();
  const values = POSTS.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content.trim(),
    category: p.category,
    tags: p.tags,
    faqs: p.faqs,
    isPublished: true,
    publishedAt: now,
  }));
  await db.insert(blogPosts).values(values).onConflictDoNothing();
  console.log(`✅ Blog seed complete: ${values.length} posts (existing slugs untouched).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Blog seed failed:', err);
  process.exit(1);
});
