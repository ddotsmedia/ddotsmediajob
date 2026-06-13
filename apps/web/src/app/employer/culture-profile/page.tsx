'use client';

import { CultureAssessment, type CultureQuestion } from '@/components/culture-assessment';

const QUESTIONS: CultureQuestion[] = [
  { id: 'pace', q: 'Our work pace is…', options: ['Steady', 'Fast', 'Deadline-driven'] },
  { id: 'structure', q: 'Our environment is…', options: ['Structured', 'Flexible', 'Fast-changing'] },
  { id: 'decisions', q: 'We make decisions…', options: ['Data-driven', 'By consensus', 'Leader-led'] },
  { id: 'comm', q: 'We mostly communicate via…', options: ['Email', 'Face-to-face', 'Chat'] },
  { id: 'autonomy', q: 'We give employees…', options: ['Clear direction', 'High autonomy', 'Light guidance'] },
  { id: 'growth', q: 'We invest in growth via…', options: ['Training', 'On-the-job', 'Mentorship'] },
  { id: 'hours', q: 'Our hours are…', options: ['Fixed', 'Flexible', 'Shift-based'] },
  { id: 'values', q: 'What we value most…', options: ['Results', 'Collaboration', 'Innovation', 'Reliability'] },
  { id: 'recognition', q: 'We recognise people…', options: ['Publicly', 'Privately', 'Financially'] },
  { id: 'diversity', q: 'Our team is…', options: ['Very diverse', 'Close-knit', 'Growing'] },
];

export default function EmployerCultureProfilePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">Company culture profile</h1>
      <p className="text-navy-700/60">Answer 10 questions. We’ll generate a culture summary shown on your company page and used for candidate culture-match scores.</p>
      <div className="mt-6"><CultureAssessment userType="employer" questions={QUESTIONS} /></div>
    </div>
  );
}
