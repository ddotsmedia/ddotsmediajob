import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POINTS = ['Free to post — always', 'AI writes your job description', 'Reach jobseekers across all 7 emirates', 'Broadcast to 120,000+ WhatsApp members'];

const STATS = [
  { n: '80K+', l: 'Professionals' },
  { n: '68+', l: 'Active Jobs' },
  { n: '7', l: 'Emirates' },
];

const ACTIVITY = [
  { role: 'Driver', emirate: 'Dubai', ago: '2 min ago' },
  { role: 'Accountant', emirate: 'Abu Dhabi', ago: '8 min ago' },
  { role: 'Nurse', emirate: 'Sharjah', ago: '15 min ago' },
  { role: 'Sales Executive', emirate: 'Dubai', ago: '23 min ago' },
];

const TRUST = ['🔒 Verified Employers', '⚡ Post in 60 sec', '📱 WhatsApp Reach'];

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
          <p className="mt-3 text-xs text-white/55">No credit card · No account needed to start</p>
        </div>

        {/* Social-proof panel */}
        <div className="w-full rounded-xl border border-teal-800 bg-[#0a2a2b] p-6">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div key={s.l} className="rounded-lg bg-white/5 px-2 py-3 text-center">
                <div className="font-display text-xl font-bold text-[#39b7bf]">{s.n}</div>
                <div className="mt-0.5 text-xs text-white/70">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Live activity feed */}
          <div className="mt-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Live Activity
            </p>
            <ul className="mt-3 divide-y divide-white/10">
              {ACTIVITY.map((a) => (
                <li key={`${a.role}-${a.ago}`} className="flex items-center gap-2 py-2 text-sm text-slate-300">
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
                  <span className="min-w-0 flex-1 truncate">{a.role} hired in {a.emirate}</span>
                  <span className="shrink-0 text-xs text-slate-500">{a.ago}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/10 pt-4 text-xs text-slate-400">
            {TRUST.map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-600">·</span>}
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
