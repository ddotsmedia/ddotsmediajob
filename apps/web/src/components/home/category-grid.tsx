import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CATEGORIES } from '@ddots/shared';
import { CategoryGlyph, catColor } from '@/components/category-icon';

/** Redesigned homepage category section: branded parent cards + subcategory name chips.
 *  Parent counts are live (stats.byCategory). Subcategory chips are names only — jobs are
 *  not tagged to subcategories, so no per-sub counts are shown. `subs` is optional and the
 *  card degrades gracefully to no chips when the category tree isn't available. */
export function CategoryGrid({
  counts,
  subs = {},
}: {
  counts: Record<string, number>;
  subs?: Record<string, string[]>;
}) {
  const cats = CATEGORIES.slice(0, 8);
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0F172A] md:text-3xl">Top Categories</h2>
          <div className="mt-1.5 h-1 w-12 rounded-full bg-[#2E8E97]" />
        </div>
        <Link href="/jobs" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-[#2E8E97] hover:underline sm:inline-flex">
          View all categories <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((c, i) => {
          const color = catColor(i);
          const topSubs = (subs[c.slug] ?? []).slice(0, 3);
          return (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="group flex flex-col rounded-xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color.bg} ${color.fg}`}>
                  <CategoryGlyph slug={c.slug} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-bold text-[#0F172A]">{c.name}</span>
                  <span className="text-xs font-semibold text-[#2E8E97]">{(counts[c.slug] ?? 0).toLocaleString('en-AE')} jobs</span>
                </span>
              </div>

              {topSubs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topSubs.map((s) => (
                    <span key={s} className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{s}</span>
                  ))}
                </div>
              )}

              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2E8E97] transition-transform group-hover:translate-x-0.5">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 text-right sm:hidden">
        <Link href="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-[#2E8E97] hover:underline">
          View all categories <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
