import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { ToolLandingView, type ToolConfig } from '@/components/seo/tool-landing-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: { absolute: 'Free ATS Resume Checker for UAE Jobs | DdotsMediaJobs' },
  description: 'Check your CV against ATS for free. AI scores your resume, finds missing keywords and gives improvements for UAE jobs.',
  alternates: { canonical: `${SITE.url}/tools/ats-checker` },
};

const config: ToolConfig = {
  canonical: '/tools/ats-checker',
  h1: 'Free ATS Resume Checker for UAE Jobs',
  subtitle: 'See how your CV scores against applicant tracking systems — and how to fix it, free.',
  ctaHref: '/dashboard/cv',
  ctaLabel: 'Check Your CV Free',
  intro: [
    'Most large UAE employers use an applicant tracking system (ATS) to scan and rank CVs before a human ever reads them. If your CV is not ATS-friendly, it can be filtered out even when you are well qualified. Our free ATS checker, powered by Claude AI, analyses your resume and tells you exactly how to improve it.',
    'Paste or upload your CV and the AI gives you an ATS readiness score, highlights missing keywords for your target role, flags formatting issues that confuse parsers, and rewrites weak sections into strong, achievement-focused bullet points.',
    'It is tuned for the UAE market — checking for the details recruiters here expect, such as nationality, visa status and clear role-relevant keywords. Use it before every application to maximise your shortlisting chances.',
  ],
  how: [
    'Sign up free and open the CV & ATS tool in your dashboard.',
    'Paste your CV text or upload your existing resume.',
    'Optionally add the job description you are targeting.',
    'Get an ATS score, missing keywords and formatting fixes.',
    'Apply the AI suggestions and re-check until you score well.',
  ],
  faq: [
    { q: 'What is ATS?', a: 'An Applicant Tracking System (ATS) is software employers use to collect, scan and rank job applications. It parses your CV into structured data, so a clean, keyword-aware format is essential.' },
    { q: 'How to pass ATS in the UAE?', a: 'Use a simple single-column layout, standard section headings, and keywords from the job description. Avoid tables, images and unusual fonts in the text. Our checker scores all of this and suggests fixes.' },
    { q: 'Is the ATS checker free?', a: 'Yes — checking and improving your CV with our AI ATS tool is free for jobseekers.' },
    { q: 'Does a high ATS score guarantee an interview?', a: 'No tool guarantees interviews, but a higher ATS score means your CV is more likely to be parsed correctly and reach a recruiter, improving your chances.' },
  ],
};

export default function Page() {
  return <ToolLandingView config={config} />;
}
