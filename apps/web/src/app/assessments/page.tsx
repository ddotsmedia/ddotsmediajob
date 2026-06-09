import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Clock, ListChecks, Trophy } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Skill Assessments — Earn Verified Badges | DdotsMediaJobs',
  description: 'Take free timed skill assessments, earn verified badges, and stand out to UAE employers. Browse tests by category and climb the weekly leaderboard.',
  alternates: { canonical: `${SITE.url}/assessments` },
};

type Item = { id: string; slug: string; title: string; categorySlug: string; description: string | null; questionCount: number; timeLimitSec: number; passScore: number; badgeName: string; badgeColor: string };
type Leader = { name: string; score: number; title: string; badge: string; completedAt: Date };

export default async function AssessmentsPage() {
  const api = await getApi();
  const [list, leaderboard] = await Promise.all([
    api.assessments.list().catch(() => [] as Item[]),
    api.assessments.leaderboard().catch(() => [] as Leader[]),
  ]);

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">Skill Assessment Centre</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Prove your skills with free timed tests. Pass to earn a verified badge on your profile — employers can filter candidates by badge.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-bold text-navy-900">Browse assessments</h2>
            {list.length === 0 ? (
              <p className="mt-4 rounded-xl border bg-white p-10 text-center text-navy-700/60">No assessments published yet. Check back soon.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {list.map((a) => (
                  <Link key={a.id} href="/dashboard/assessments" className="rounded-xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-bold text-navy-900">{a.title}</h3>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: a.badgeColor }}><Award className="h-3 w-3" /> {a.badgeName}</span>
                    </div>
                    {a.description && <p className="mt-1 line-clamp-2 text-sm text-navy-700/70">{a.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-navy-700/60">
                      <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {a.questionCount} questions</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.timeLimitSec}s each</span>
                      <span className="capitalize">{a.categorySlug}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><Trophy className="h-5 w-5 text-gold-500" /> This week&apos;s leaders</h2>
            <div className="mt-4 rounded-xl border bg-white p-4">
              {leaderboard.length === 0 ? (
                <p className="py-6 text-center text-sm text-navy-700/60">No scores yet this week. Be the first!</p>
              ) : (
                <ol className="space-y-2">
                  {leaderboard.map((r, i) => (
                    <li key={`${r.name}-${i}`} className="flex items-center gap-3 text-sm">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-gold-100 text-gold-700' : 'bg-navy-100 text-navy-700'}`}>{i + 1}</span>
                      <span className="flex-1 truncate font-medium text-navy-900">{r.name}</span>
                      <span className="text-navy-700/60">{r.title}</span>
                      <span className="font-bold text-teal-700">{r.score}%</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <Link href="/dashboard/assessments" className="mt-4 block rounded-lg bg-teal-600 px-4 py-3 text-center font-semibold text-white hover:bg-teal-700">Take an assessment →</Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
