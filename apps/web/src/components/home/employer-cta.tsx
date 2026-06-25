import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POINTS = ['Free to post — no credit card', 'AI writes your job description', 'Reach 80,000+ UAE jobseekers', 'Verified candidate matches'];

export function EmployerCTA() {
  return (
    <section className="bg-[#083B3A]">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 md:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Hire the Right Talent, Faster</h2>
          <ul className="mt-5 space-y-2.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-white/85">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2E8E97]"><Check className="h-3 w-3 text-white" /></span>
                {p}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-6 bg-[#F9733A] font-bold text-white hover:bg-[#e2652f]">
            <Link href="/employer/post">Post a Job Free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="hidden md:block">
          <div className="aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-[#2E8E97]/40 to-[#083B3A] ring-1 ring-white/10" />
        </div>
      </div>
    </section>
  );
}
