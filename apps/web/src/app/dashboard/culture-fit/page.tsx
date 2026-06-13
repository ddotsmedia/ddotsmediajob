'use client';

import { CultureAssessment, type CultureQuestion } from '@/components/culture-assessment';

const QUESTIONS: CultureQuestion[] = [
  { id: 'work_mode', q: 'I prefer working…', options: ['Independently', 'In a team', 'A mix of both'] },
  { id: 'structure', q: 'My ideal environment is…', options: ['Structured routine', 'Flexible hours', 'Fast-changing'] },
  { id: 'comm', q: 'I communicate best via…', options: ['Email', 'Face-to-face', 'WhatsApp/chat'] },
  { id: 'value', q: 'What matters most to me?', options: ['Job security', 'Growth', 'Impact', 'Salary'] },
  { id: 'pace', q: 'I work best at a…', options: ['Steady pace', 'Fast pace', 'Deadline-driven pace'] },
  { id: 'feedback', q: 'I like feedback that is…', options: ['Frequent', 'Occasional', 'Only when needed'] },
  { id: 'decisions', q: 'Decisions should be…', options: ['Data-driven', 'Consensus-based', 'Leader-led'] },
  { id: 'risk', q: 'My attitude to risk…', options: ['Cautious', 'Balanced', 'Bold'] },
  { id: 'learning', q: 'I grow best through…', options: ['Formal training', 'On-the-job', 'Mentorship'] },
  { id: 'recognition', q: 'I value recognition that is…', options: ['Public', 'Private', 'Financial'] },
  { id: 'autonomy', q: 'I want…', options: ['Clear direction', 'Full autonomy', 'Light guidance'] },
  { id: 'team_size', q: 'I thrive in a…', options: ['Small team', 'Large org', 'Startup'] },
  { id: 'conflict', q: 'I handle conflict by…', options: ['Addressing directly', 'Finding compromise', 'Avoiding it'] },
  { id: 'hours', q: 'My ideal hours…', options: ['Fixed 9–6', 'Flexible', 'Shift-based'] },
  { id: 'travel', q: 'Work travel…', options: ['I enjoy it', 'Occasionally', 'Prefer none'] },
  { id: 'manager', q: 'My ideal manager is…', options: ['Hands-on', 'Hands-off', 'Coach'] },
  { id: 'prayer', q: 'Prayer-time breaks at work…', options: ['Important to me', 'Nice to have', 'Not needed'] },
  { id: 'ramadan', q: 'Ramadan-adjusted schedule…', options: ['Important', 'Nice to have', 'Not needed'] },
  { id: 'diversity', q: 'I prefer a team that is…', options: ['Very diverse', 'Close-knit', 'Either'] },
  { id: 'purpose', q: 'I am motivated most by…', options: ['Mission', 'Money', 'Mastery', 'People'] },
];

export default function CultureFitPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">Culture-fit assessment</h1>
      <p className="text-navy-700/60">A quick 20-question assessment. We’ll generate your work-style profile and use it to surface jobs that match how you like to work.</p>
      <div className="mt-6"><CultureAssessment userType="seeker" questions={QUESTIONS} /></div>
    </div>
  );
}
