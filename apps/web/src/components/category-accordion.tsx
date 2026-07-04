'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { CategoryGlyph, catColor } from '@/components/category-icon';
import { cn } from '@/lib/utils';

export type AccordionCategory = {
  slug: string;
  name: string;
  count: number;
  subs: string[];
};

/** Expandable category browser. Parent counts are live; subcategory chips are names only
 *  (jobs aren't tagged to subcategories) and link into the existing keyword search. */
export function CategoryAccordion({ items, current }: { items: AccordionCategory[]; current: string }) {
  const [open, setOpen] = useState<string | null>(current);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((c, i) => {
        const color = catColor(i);
        const isCurrent = c.slug === current;
        const isOpen = open === c.slug;
        return (
          <div
            key={c.slug}
            className={cn(
              'rounded-xl border bg-white transition-all',
              isCurrent ? 'border-teal-400 shadow-sm' : 'border-slate-100',
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : c.slug)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color.bg} ${color.fg}`}>
                <CategoryGlyph slug={c.slug} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-bold text-[#0F172A]">{c.name}</span>
                <span className="text-xs font-semibold text-[#2E8E97]">{c.count.toLocaleString('en-AE')} jobs</span>
              </span>
              {c.subs.length > 0 && (
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 p-4 pt-3">
                {c.subs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.subs.map((s) => (
                      <Link
                        key={s}
                        href={`/jobs?category=${c.slug}&q=${encodeURIComponent(s)}`}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition-colors hover:bg-teal-50 hover:text-teal-700"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                )}
                <Link
                  href={`/category/${c.slug}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#2E8E97] hover:underline"
                >
                  View all {c.name} jobs <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
