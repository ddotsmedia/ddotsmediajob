import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, Sparkles } from 'lucide-react';
import { SITE, CATEGORIES, categoryBySlug, emirateBySlug } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { HBars } from '@/components/admin/mini-bar';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'UAE Jobs Market Insights 2026 — Trends & Demand | DdotsMediaJobs',
  description: 'Live UAE job market insights: most in-demand skills by industry, hiring demand by emirate and category, and where the vacancies are right now.',
  alternates: { canonical: `${SITE.url}/market-insights` },
};

export default async function MarketInsightsPage() {
  const api = await getApi();
  const data = await api.content.marketInsights().catch(() => ({ trending: {} as Record<string, string[]>, byCategory: [], byEmirate: [], total: 0 }));

  const catBars = data.byCategory.map((d) => ({ label: categoryBySlug(d.label)?.name ?? d.label, value: d.value })).slice(0, 10);
  const emBars = data.byEmirate.map((d) => ({ label: emirateBySlug(d.label)?.name ?? d.label, value: d.value }));
  const trendingCats = CATEGORIES.filter((c) => (data.trending[c.slug]?.length ?? 0) > 0);

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center gap-2 text-teal-300"><TrendingUp className="h-5 w-5" /><span className="text-sm font-medium">Market Insights</span></div>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">UAE Jobs Market Insights 2026</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">A live snapshot of the UAE hiring market — {data.total.toLocaleString('en-AE')} active vacancies, demand by industry and emirate, and the skills employers want now.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-display text-sm font-bold text-navy-900">Hiring demand by industry</h2>
            {catBars.length ? <HBars data={catBars} /> : <p className="text-sm text-navy-700/50">No data yet.</p>}
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-display text-sm font-bold text-navy-900">Vacancies by emirate</h2>
            {emBars.length ? <HBars data={emBars} /> : <p className="text-sm text-navy-700/50">No data yet.</p>}
          </div>
        </div>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><Sparkles className="h-5 w-5 text-teal-500" /> In-demand skills by industry</h2>
          {trendingCats.length === 0 ? (
            <p className="mt-3 rounded-xl border bg-white p-6 text-sm text-navy-700/60">Trending skills are refreshed weekly. Check back soon.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {trendingCats.map((c) => (
                <div key={c.slug} className="rounded-xl border bg-white p-4">
                  <Link href={`/category/${c.slug}`} className="font-display font-bold text-navy-900 hover:text-teal-600">{c.name}</Link>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.trending[c.slug]!.map((s) => <span key={s} className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <article className="mt-10 max-w-2xl space-y-3 text-sm leading-relaxed text-navy-700/80">
          <h2 className="font-display text-lg font-bold text-navy-900">About this report</h2>
          <p>These insights are generated from live DdotsMediaJobs listings and refreshed automatically. Industry and emirate demand reflect currently active vacancies; trending skills are extracted weekly from recent job descriptions across each category.</p>
          <p>Use them to target high-demand fields, prioritise the skills employers are asking for, and focus your search where the vacancies are. Explore <Link href="/jobs" className="text-teal-600 hover:underline">all jobs</Link> or the <Link href="/salary-guide" className="text-teal-600 hover:underline">salary guide</Link> to go deeper.</p>
        </article>
      </div>
    </div>
  );
}
