import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { CourseGrid, type Course } from './courses';

export const metadata: Metadata = {
  title: 'Learn & Certify — UAE Career Courses & Certifications',
  description: 'Upskill for UAE jobs. KHDA-approved providers, in-demand certifications and courses that employers value. Browse free.',
  alternates: { canonical: 'https://ddotsmediajobs.com/learn' },
};

const COURSES: Course[] = [
  { id: 'bls-cert', name: 'Basic Life Support (BLS)', provider: 'DHA-approved', duration: '1 day', price: 'AED 350', skills: ['Healthcare', 'First Aid'], url: 'https://www.google.com/search?q=BLS+certification+Dubai', inDemand: true },
  { id: 'cma', name: 'Certified Management Accountant', provider: 'Coursera', duration: '6 months', price: 'AED 1,800', skills: ['Finance', 'Accounting'], url: 'https://www.coursera.org', inDemand: true },
  { id: 'pmp', name: 'PMP Project Management', provider: 'KHDA-approved', duration: '3 months', price: 'AED 3,500', skills: ['Project Management', 'Leadership'], url: 'https://www.google.com/search?q=PMP+course+Dubai' },
  { id: 'react-dev', name: 'Front-End with React', provider: 'Udemy Business', duration: '8 weeks', price: 'AED 89', skills: ['React', 'JavaScript', 'Web'], url: 'https://www.udemy.com', inDemand: true },
  { id: 'data-analytics', name: 'Google Data Analytics', provider: 'Coursera', duration: '3 months', price: 'AED 1,500', skills: ['Data', 'SQL', 'Excel'], url: 'https://www.coursera.org' },
  { id: 'digital-marketing', name: 'Digital Marketing', provider: 'LinkedIn Learning', duration: '4 weeks', price: 'Subscription', skills: ['Marketing', 'SEO', 'Social'], url: 'https://www.linkedin.com/learning' },
  { id: 'sira', name: 'SIRA Security Training', provider: 'SIRA-approved', duration: '1 week', price: 'AED 600', skills: ['Security'], url: 'https://www.google.com/search?q=SIRA+training+Dubai', inDemand: true },
  { id: 'forklift', name: 'Forklift Operator Licence', provider: 'ACTVET', duration: '3 days', price: 'AED 500', skills: ['Logistics', 'Warehouse'], url: 'https://www.google.com/search?q=forklift+licence+UAE' },
  { id: 'english-ielts', name: 'IELTS Preparation', provider: 'British Council', duration: '6 weeks', price: 'AED 1,200', skills: ['English', 'Communication'], url: 'https://www.britishcouncil.ae' },
];

export default function LearnPage() {
  return (
    <div className="bg-navy-50/30">
      <section className="bg-navy-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><GraduationCap className="h-4 w-4" /> Learn &amp; Certify</span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Upskill for UAE jobs</h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">Courses and certifications from KHDA-approved and global providers — chosen for skills UAE employers actually hire for.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <CourseGrid courses={COURSES} />
        <p className="mt-6 text-center text-xs text-navy-700/50">DdotsMediaJobs may earn a commission from some course providers. This never affects the price you pay.</p>
      </div>
    </div>
  );
}
