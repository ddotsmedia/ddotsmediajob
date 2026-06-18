'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavLink = { label: string; href: string; highlight?: boolean };
type Col = { header: string; links: NavLink[] };
type Card =
  | { kind: 'cta'; bg: 'teal' | 'navy'; title: string; text: string; button: NavLink }
  | { kind: 'stats'; title: string; lines: string[]; button: NavLink };
type Tab = { id: string; label: string; columns: Col[]; card?: Card };

export const MENU: Tab[] = [
  {
    id: 'jobs',
    label: 'Jobs',
    columns: [
      { header: 'Browse by Location', links: [
        { label: 'Jobs in Dubai', href: '/jobs?emirate=dubai' }, { label: 'Jobs in Abu Dhabi', href: '/jobs?emirate=abu-dhabi' }, { label: 'Jobs in Sharjah', href: '/jobs?emirate=sharjah' }, { label: 'Jobs in Ajman', href: '/jobs?emirate=ajman' }, { label: 'Jobs in RAK', href: '/jobs?emirate=ras-al-khaimah' }, { label: 'Jobs in Fujairah', href: '/jobs?emirate=fujairah' }, { label: 'All Emirates →', href: '/jobs' },
      ] },
      { header: 'Top Categories', links: [
        { label: 'IT & Software', href: '/jobs?category=it' }, { label: 'Healthcare', href: '/jobs?category=healthcare' }, { label: 'Finance & Accounting', href: '/jobs?category=finance' }, { label: 'Sales & Marketing', href: '/jobs?category=sales' }, { label: 'Construction', href: '/jobs?category=construction' }, { label: 'Hospitality & Tourism', href: '/jobs?category=hospitality' }, { label: 'Driving & Transport', href: '/jobs?category=driving' }, { label: 'Education', href: '/jobs?category=education' }, { label: 'View all categories →', href: '/jobs' },
      ] },
      { header: 'Job Type', links: [
        { label: 'Walk-in Interviews', href: '/walk-in-interviews' }, { label: 'Urgent Hiring', href: '/jobs?isUrgent=1' }, { label: 'Visa Provided Jobs', href: '/jobs?visaProvided=1' }, { label: 'Fresher Jobs', href: '/jobs?isFresher=1' }, { label: 'Part Time Jobs', href: '/jobs?jobType=part-time' }, { label: 'Remote Jobs', href: '/jobs?isRemote=1' }, { label: 'Female Jobs UAE', href: '/jobs?q=female' }, { label: 'Gulf Jobs', href: '/jobs?q=gulf' },
      ] },
      { header: 'Popular Searches', links: [
        { label: 'Driver Jobs Dubai', href: '/jobs?category=driving&emirate=dubai' }, { label: 'Nurse Jobs UAE', href: '/jobs?category=healthcare' }, { label: 'Accountant Jobs UAE', href: '/jobs?category=finance' }, { label: 'Receptionist Dubai', href: '/jobs?category=admin&emirate=dubai' }, { label: 'IT Jobs Abu Dhabi', href: '/jobs?category=it&emirate=abu-dhabi' }, { label: 'Jobs for Indians', href: '/jobs?q=indian' }, { label: 'Jobs for Filipinos', href: '/jobs?q=filipino' }, { label: 'Jobs for Pakistanis', href: '/jobs?q=pakistani' },
      ] },
    ],
  },
  {
    id: 'seekers',
    label: 'For Jobseekers',
    columns: [
      { header: 'Find Work', links: [
        { label: 'Browse All Jobs', href: '/jobs' }, { label: 'Job Alerts', href: '/dashboard/alerts' }, { label: 'Saved Jobs', href: '/dashboard/saved' }, { label: 'My Applications', href: '/dashboard/applications' }, { label: 'Swipe to Apply', href: '/swipe' }, { label: 'Compare Jobs', href: '/compare' },
      ] },
      { header: 'Career Tools', links: [
        { label: 'ATS CV Builder', href: '/cv-builder' }, { label: 'AI CV Builder', href: '/dashboard/cv' }, { label: 'ATS Score Checker', href: '/tools/ats-checker' }, { label: 'AI Career Advisor', href: '/career-advisor' }, { label: 'AI Interview Prep', href: '/interview-prep' }, { label: 'Skill Assessments', href: '/assessments' }, { label: 'Salary Guide', href: '/salary-guide' }, { label: 'STAR Coach', href: '/dashboard/star-coach' },
      ] },
      { header: 'Resources', links: [
        { label: 'Success Stories', href: '/success-stories' }, { label: 'Market Insights', href: '/market-insights' }, { label: 'Labour Rights Guide', href: '/resources/labour-rights' }, { label: 'Relocation Advisor', href: '/resources/relocation-advisor' }, { label: 'Cost of Living UAE', href: '/salary-guide' }, { label: 'Visa Guide 2026', href: '/visa-guide' }, { label: 'Nafis & Emiratisation', href: '/nafis-guide' },
      ] },
    ],
    card: { kind: 'cta', bg: 'teal', title: 'AI-Powered Job Search', text: 'CV builder, interview prep, salary insights — all free.', button: { label: 'Get Started Free', href: '/register' } },
  },
  {
    id: 'employers',
    label: 'For Employers',
    columns: [
      { header: 'Hire Now', links: [
        { label: 'Post a Job', href: '/employer/post', highlight: true }, { label: 'Browse Talent Pool', href: '/talent' }, { label: 'Employer Dashboard', href: '/employer' }, { label: 'Company Profiles', href: '/companies' }, { label: 'Verified Employers', href: '/verified-employers' },
      ] },
      { header: 'ATS & Tools', links: [
        { label: 'Application Pipeline', href: '/employer/jobs' }, { label: 'Interview Scheduling', href: '/employer/availability' }, { label: 'Scorecard System', href: '/employer/scorecards' }, { label: 'Offer Letter Manager', href: '/employer/offers' }, { label: 'Skills Assessments', href: '/employer/assessments' }, { label: 'Reference Checks', href: '/employer/jobs' },
      ] },
      { header: 'UAE Compliance', links: [
        { label: 'Emiratization Dashboard', href: '/employer/emiratization' }, { label: 'MOHRE Work Permits', href: '/employer' }, { label: 'WPS Compliance', href: '/wps-calculator' }, { label: 'Gratuity Calculator', href: '/employer/emiratization' }, { label: 'Nafis Subsidies', href: '/nafis-guide' },
      ] },
    ],
    card: { kind: 'cta', bg: 'navy', title: 'Post Jobs Free', text: 'Reach 120,000+ UAE professionals instantly.', button: { label: 'Post a Job Now', href: '/employer/post' } },
  },
  {
    id: 'community',
    label: 'Community',
    columns: [
      { header: 'WhatsApp Groups', links: [
        { label: 'Browse All 76 Groups', href: '/whatsapp-groups' }, { label: 'Healthcare Groups', href: '/whatsapp-groups' }, { label: 'IT & Tech Groups', href: '/whatsapp-groups' }, { label: 'Driving Groups', href: '/whatsapp-groups' }, { label: 'Finance Groups', href: '/whatsapp-groups' }, { label: 'Join a Group', href: '/whatsapp-groups' },
      ] },
      { header: 'Connect', links: [
        { label: 'Community Forum', href: '/community' }, { label: 'Community Q&A', href: '/community/qa' }, { label: 'Find a Mentor', href: '/community/mentors' }, { label: 'Become a Mentor', href: '/community/become-mentor' }, { label: 'Success Stories', href: '/success-stories' }, { label: 'Volunteer Portal', href: '/volunteer' },
      ] },
      { header: 'Events & More', links: [
        { label: 'Upcoming Events', href: '/community/events' }, { label: 'Community Leaderboard', href: '/community/leaderboard' }, { label: 'Salary Polls', href: '/community' }, { label: 'Anti-Scam Checker', href: '/tools/job-scam-checker' }, { label: 'Refer & Earn', href: '/dashboard/invite' }, { label: 'Newsletter', href: '/community' },
      ] },
    ],
    card: { kind: 'stats', title: '', lines: ['76 WhatsApp Groups', '120,000+ Members', '16 Professions'], button: { label: 'Join Community', href: '/whatsapp-groups' } },
  },
  {
    id: 'tools',
    label: 'UAE Tools',
    columns: [
      { header: 'Calculators', links: [
        { label: 'WPS & Gratuity Calculator', href: '/wps-calculator' }, { label: 'Cost of Living UAE', href: '/salary-guide' }, { label: 'Salary Calculator', href: '/tools/salary-calculator' }, { label: 'Golden Visa Checker', href: '/visa-guide' }, { label: 'Nafis Guide', href: '/nafis-guide' },
      ] },
      { header: 'Guides', links: [
        { label: 'UAE Visa Guide 2026', href: '/visa-guide' }, { label: 'Labour Rights', href: '/resources/labour-rights' }, { label: 'Relocation Advisor', href: '/resources/relocation-advisor' }, { label: 'Free Zone Jobs', href: '/jobs?freeZone=1' }, { label: 'Career Transition', href: '/tools/career-transition' },
      ] },
      { header: 'AI Tools', links: [
        { label: 'AI Career Advisor', href: '/career-advisor' }, { label: 'AI Interview Prep', href: '/interview-prep' }, { label: 'Job Scam Checker', href: '/tools/job-scam-checker' }, { label: 'ATS Score Checker', href: '/tools/ats-checker' }, { label: 'Salary Negotiation Simulator', href: '/tools/negotiation-simulator' },
      ] },
    ],
  },
];

function CardBox({ card }: { card: Card }) {
  if (card.kind === 'stats') {
    return (
      <div className="flex h-full flex-col justify-between rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 p-4 text-white">
        <div className="space-y-1">{card.lines.map((l) => <p key={l} className="font-display text-lg font-bold leading-tight">{l}</p>)}</div>
        <Link href={card.button.href} className="mt-3 rounded-lg bg-white px-3 py-2 text-center text-sm font-bold text-teal-700 hover:bg-white/90">{card.button.label}</Link>
      </div>
    );
  }
  return (
    <div className={cn('flex h-full flex-col justify-between rounded-lg p-4', card.bg === 'teal' ? 'bg-teal-600 text-white' : 'border border-teal-500 bg-navy-900 text-white')}>
      <div>
        <p className="font-display text-base font-bold">{card.title}</p>
        <p className="mt-1 text-sm text-white/80">{card.text}</p>
      </div>
      <Link href={card.button.href} className={cn('mt-3 rounded-lg px-3 py-2 text-center text-sm font-bold', card.bg === 'teal' ? 'bg-white text-teal-700 hover:bg-white/90' : 'bg-teal-500 text-white hover:bg-teal-400')}>{card.button.label}</Link>
    </div>
  );
}

/** Desktop mega-nav: hover to open, click-outside / Escape / hover-away (300ms) to close. */
export function DesktopMegaNav() {
  const [active, setActive] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function openTab(id: string) { if (closeTimer.current) clearTimeout(closeTimer.current); setActive(id); }
  function scheduleClose() { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setActive(null), 300); }

  useEffect(() => {
    if (active) { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }
    setShown(false);
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    const onClick = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setActive(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  const activeTab = MENU.find((t) => t.id === active);

  return (
    <div ref={rootRef} className="hidden md:block" onMouseLeave={scheduleClose}>
      <nav className="flex items-center gap-1">
        {MENU.map((t) => (
          <button
            key={t.id}
            type="button"
            onMouseEnter={() => openTab(t.id)}
            onClick={() => setActive((a) => (a === t.id ? null : t.id))}
            className={cn('flex items-center gap-1 border-b-2 px-3 py-2 text-sm font-medium transition-colors', active === t.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-navy-700 hover:text-teal-600')}
            aria-expanded={active === t.id}
          >
            {t.label} <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', active === t.id && 'rotate-180')} />
          </button>
        ))}
      </nav>

      {activeTab && (
        <div
          className={cn('absolute left-0 right-0 top-full z-[100] border-t bg-white shadow-xl transition duration-150 ease-out', shown ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')}
          onMouseEnter={() => openTab(activeTab.id)}
        >
          <div className="mx-auto grid max-h-[420px] max-w-7xl gap-8 overflow-y-auto px-6 py-8" style={{ gridTemplateColumns: `repeat(${activeTab.columns.length + (activeTab.card ? 1 : 0)}, minmax(0,1fr))` }}>
            {activeTab.columns.map((col) => (
              <div key={col.header}>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[1.5px] text-navy-400">{col.header}</p>
                <ul className="space-y-1.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} onClick={() => setActive(null)} className={cn('block text-[13px] hover:text-teal-600', l.highlight ? 'font-semibold text-teal-600' : 'text-navy-700')}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {activeTab.card && <CardBox card={activeTab.card} />}
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile accordion: each tab expands to a flat list of its links. */
export function MobileMegaNav({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="flex flex-col">
      {MENU.map((t) => (
        <div key={t.id} className="border-b">
          <button type="button" onClick={() => setOpen((o) => (o === t.id ? null : t.id))} className="flex w-full items-center justify-between px-3 py-4 text-lg font-medium text-navy-800" aria-expanded={open === t.id}>
            {t.label} <ChevronDown className={cn('h-5 w-5 transition-transform', open === t.id && 'rotate-180')} />
          </button>
          {open === t.id && (
            <div className="space-y-3 px-3 pb-4">
              {t.columns.map((col) => (
                <div key={col.header}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[1.5px] text-navy-400">{col.header}</p>
                  {col.links.map((l) => (
                    <Link key={l.label} href={l.href} onClick={onNavigate} className="block py-1.5 text-sm text-navy-700 hover:text-teal-600">{l.label}</Link>
                  ))}
                </div>
              ))}
              {t.card && <Link href={t.card.button.href} onClick={onNavigate} className="mt-1 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">{t.card.button.label}</Link>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
