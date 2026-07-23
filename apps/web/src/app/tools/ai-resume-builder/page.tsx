import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { ToolLandingView, type ToolConfig } from '@/components/seo/tool-landing-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: { absolute: 'Free AI Resume Builder for UAE Jobs | DdotsMediaJobs' },
  description: 'Build a free ATS-optimised CV for UAE jobs with AI. Claude AI writes your resume, checks ATS score and suggests improvements.',
  alternates: { canonical: `${SITE.url}/tools/ai-resume-builder` },
};

const config: ToolConfig = {
  canonical: '/tools/ai-resume-builder',
  h1: 'Free AI Resume Builder for UAE Jobs',
  subtitle: 'Create a professional, ATS-ready CV tailored to the UAE market — written by AI, free.',
  ctaHref: '/dashboard/cv',
  ctaLabel: 'Build Your CV Free',
  intro: [
    'A strong, well-formatted CV is the single biggest factor in getting shortlisted for UAE jobs. Our free AI resume builder helps you create a professional, ATS-optimised CV in minutes — no design skills needed. It follows the format UAE recruiters expect, including a photo, professional summary, quantified achievements, skills and your visa status.',
    'Powered by Claude AI, the builder can write and rewrite your bullet points to be achievement-focused, suggest the right keywords for your target role, and check how well your CV will pass applicant tracking systems (ATS) used by large UAE employers.',
    'Choose from clean, recruiter-friendly templates, edit everything in a live preview, and export to PDF when you are ready. Your CV is saved to your account so you can update and reuse it for every application.',
  ],
  how: [
    'Sign up free and open the CV Builder in your dashboard.',
    'Enter your details — or let the AI write your summary and bullet points.',
    'Pick a template and review the live preview.',
    'Check your ATS score and apply the AI improvement suggestions.',
    'Export to PDF and apply to UAE jobs in one click.',
  ],
  faq: [
    { q: 'Is the AI resume builder free?', a: 'Yes. Building and exporting your CV with our AI resume builder is completely free for jobseekers.' },
    { q: 'Does it pass ATS?', a: 'The builder uses a clean, single-column, keyword-aware format and gives you an ATS score with suggestions, so your CV is far more likely to be parsed correctly by UAE employers’ systems.' },
    { q: 'Is the AI resume builder good for UAE jobs?', a: 'Yes — it follows UAE conventions including a photo, nationality and visa status, and tailors content to the UAE market and your target role.' },
    { q: 'Can I edit the AI-generated CV?', a: 'Absolutely. Everything is fully editable in a live preview, and your CV is saved so you can update it any time.' },
  ],
};

export default function Page() {
  return <ToolLandingView config={config} />;
}
