import Link from 'next/link';
import { CATEGORIES } from '@ddots/shared';
import { CategoryIcon } from '@/components/category-icon';

export function CategoryGrid({ counts }: { counts: Record<string, number> }) {
  const cats = CATEGORIES.slice(0, 8);
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-[#0F172A] md:text-3xl">Top Categories</h2>
        <div className="mt-1.5 h-1 w-12 rounded-full bg-[#2E8E97]" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`} className="flex items-center gap-3 rounded-xl border border-[#E5EEF0] bg-white p-4 transition-all hover:border-[#2E8E97] hover:shadow-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2E8E97]/10 text-[#2E8E97]"><CategoryIcon name={c.icon} className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold text-[#0F172A]">{c.name}</span>
              <span className="text-xs font-semibold text-[#2E8E97]">{(counts[c.slug] ?? 0).toLocaleString('en-AE')} jobs</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
