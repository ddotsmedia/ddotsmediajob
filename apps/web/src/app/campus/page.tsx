import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, Building2, Users, BadgeCheck, Briefcase, ArrowRight } from 'lucide-react';
import { CampusJobBoard } from './campus-job-board';

export const metadata: Metadata = {
  title: 'Campus Jobs UAE 2026 — Internships & Graduate Jobs',
  description:
    'Find internships and graduate jobs in UAE. Partner universities: UAEU, AUS, HCT. Apply free.',
  alternates: { canonical: 'https://ddotsmediajobs.com/campus' },
};

const UNIVERSITIES = [
  { name: 'United Arab Emirates University', short: 'UAEU', city: 'Al Ain' },
  { name: 'American University of Sharjah', short: 'AUS', city: 'Sharjah' },
  { name: 'Higher Colleges of Technology', short: 'HCT', city: 'Nationwide' },
  { name: 'Khalifa University', short: 'KU', city: 'Abu Dhabi' },
  { name: 'American University in Dubai', short: 'AUD', city: 'Dubai' },
  { name: 'Zayed University', short: 'ZU', city: 'Dubai / Abu Dhabi' },
  { name: 'University of Sharjah', short: 'UoS', city: 'Sharjah' },
  { name: 'Al Ain University', short: 'AAU', city: 'Al Ain / Abu Dhabi' },
  { name: 'BITS Pilani Dubai', short: 'BPDC', city: 'Dubai' },
  { name: 'Heriot-Watt University Dubai', short: 'HWUD', city: 'Dubai' },
  { name: 'Middlesex University Dubai', short: 'MDX', city: 'Dubai' },
  { name: 'SP Jain School of Global Management', short: 'SP Jain', city: 'Dubai' },
];

const FAQ = [
  { q: 'Are campus jobs and internships on DdotsMediaJobs free?', a: 'Yes. Browsing and applying to internships, graduate and part-time roles is completely free for students and graduates.' },
  { q: 'Which UAE universities can apply?', a: 'Students and graduates from all UAE institutions — including UAEU, AUS, HCT, Khalifa University, Zayed University and more — can apply.' },
  { q: 'Can I find part-time jobs as a student?', a: 'Yes. Use the Part-time tab on the campus job board to find roles that fit a student schedule.' },
  { q: 'How do I apply for an internship?', a: 'Open any internship listing and apply directly — many UAE internships accept applications by email or WhatsApp.' },
];

export default function CampusPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-navy-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <GraduationCap className="h-4 w-4" /> UAE Campus Recruitment
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Connect with Top University Talent</h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">
            Internships, graduate programmes and part-time roles for UAE students and fresh graduates — from KHDA-verified
            institutions, all in one place.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/jobs?jobType=internship" className="rounded-lg bg-teal-500 px-5 py-2.5 font-semibold text-white hover:bg-teal-400">Browse internships</Link>
            <Link href="/register" className="rounded-lg bg-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/20">Register as a student</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-12">
        {/* Universities */}
        <section>
          <h2 className="font-display text-2xl font-bold text-navy-900">UAE partner universities</h2>
          <p className="mt-1 text-navy-700/60">Students and graduates from these institutions are hiring-ready on DdotsMediaJobs.</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {UNIVERSITIES.map((u) => (
              <Link
                key={u.short}
                href="/jobs?jobType=internship"
                className="group flex flex-col rounded-xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 font-display text-sm font-bold text-teal-700">{u.short.slice(0, 4)}</div>
                <p className="mt-3 line-clamp-2 font-semibold text-navy-900">{u.name}</p>
                <p className="text-xs text-navy-700/60">{u.city}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 group-hover:underline">Browse internships <ArrowRight className="h-3 w-3" /></span>
              </Link>
            ))}
          </div>
        </section>

        {/* Job board */}
        <section>
          <h2 className="font-display text-2xl font-bold text-navy-900">Campus job board</h2>
          <p className="mt-1 text-navy-700/60">Internships, graduate trainee roles, part-time and fresh-graduate jobs across the UAE.</p>
          <div className="mt-6"><CampusJobBoard /></div>
        </section>

        {/* CTAs */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6">
            <Building2 className="h-7 w-7 text-teal-600" />
            <h3 className="mt-3 font-display text-xl font-bold text-navy-900">Recruit Top UAE Graduates</h3>
            <ul className="mt-3 space-y-2 text-sm text-navy-700/70">
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-teal-600" /> 50,000+ student & graduate profiles</li>
              <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-teal-600" /> KHDA-verified institutions</li>
              <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-teal-600" /> Direct campus access</li>
              <li className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-teal-600" /> Emiratization-compliant hiring</li>
            </ul>
            <Link href="/employer/post?type=internship" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700">
              Post Campus Job <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border bg-white p-6">
            <GraduationCap className="h-7 w-7 text-orange-500" />
            <h3 className="mt-3 font-display text-xl font-bold text-navy-900">Start your career in the UAE</h3>
            <p className="mt-2 text-sm text-navy-700/70">Build a profile, upload your CV and apply to internships and graduate jobs in one tap.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white hover:bg-orange-600">Register as a student</Link>
              <Link href="/dashboard/cv" className="rounded-lg border px-5 py-2.5 font-semibold text-navy-700 hover:bg-navy-50">Upload your CV</Link>
              <Link href="/jobs?jobType=internship" className="rounded-lg border px-5 py-2.5 font-semibold text-navy-700 hover:bg-navy-50">Browse internships</Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-display text-2xl font-bold text-navy-900">Campus jobs FAQ</h2>
          <div className="mt-4 divide-y rounded-xl border bg-white">
            {FAQ.map((f) => (
              <div key={f.q} className="p-5">
                <p className="font-semibold text-navy-900">{f.q}</p>
                <p className="mt-1 text-sm text-navy-700/70">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
