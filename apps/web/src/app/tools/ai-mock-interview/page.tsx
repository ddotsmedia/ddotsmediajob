import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { ToolLandingView, type ToolConfig } from '@/components/seo/tool-landing-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Free AI Mock Interview Practice for UAE Jobs | DdotsMediaJobs',
  description: 'Practise UAE job interviews with AI for free. Role-specific questions, model answers and instant feedback to help you get hired.',
  alternates: { canonical: `${SITE.url}/tools/ai-mock-interview` },
};

const config: ToolConfig = {
  canonical: '/tools/ai-mock-interview',
  h1: 'Free AI Mock Interview Practice for UAE Jobs',
  subtitle: 'Rehearse with an AI interviewer, get scored on your answers, and walk in confident — free.',
  ctaHref: '/interview-prep',
  ctaLabel: 'Start Practice Interview',
  intro: [
    'Interviews in the UAE blend role-specific technical questions with practical checks on your visa status, notice period and salary expectations, plus a strong focus on cultural fit in a multicultural workforce. The best way to prepare is to practise — and our free AI mock interview lets you rehearse as many times as you like.',
    'Choose your target role and the AI asks realistic UAE interview questions, then gives you model answers and instant feedback. Our STAR coach scores your behavioural answers on Situation, Task, Action and Result, so you learn to structure responses that impress UAE hiring managers.',
    'Use it to prepare for any role — driver, nurse, accountant, sales, IT, engineering and more. Practise your salary negotiation too, so you can confidently discuss your AED package when the offer comes.',
  ],
  how: [
    'Open the free AI Interview Prep tool and enter your target role.',
    'The AI generates likely questions with strong sample answers.',
    'Practise your own answers and get scored by the STAR coach.',
    'Review the feedback and refine weak areas.',
    'Repeat until you feel confident, then apply to UAE jobs.',
  ],
  faq: [
    { q: 'How to prepare for a UAE job interview?', a: 'Research the company, prepare STAR examples, and know your visa status, notice period and salary expectations. Practise common questions for your role — our free AI mock interview helps you rehearse and improve.' },
    { q: 'Is the AI mock interview free?', a: 'Yes. Generating questions, model answers and scoring your responses is free for jobseekers.' },
    { q: 'What questions are asked in UAE interviews?', a: 'Expect questions on your experience, visa status, notice period, salary expectations and how you work in multicultural teams, plus role-specific technical questions.' },
    { q: 'Can I practise salary negotiation?', a: 'Yes — our tools include a salary coach and negotiation simulator so you can rehearse discussing your AED package before the real conversation.' },
  ],
};

export default function Page() {
  return <ToolLandingView config={config} />;
}
