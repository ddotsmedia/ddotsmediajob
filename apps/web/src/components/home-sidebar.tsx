'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Footprints, Zap, ShieldCheck, Sparkles, Clock, FileText, BarChart3, ShieldAlert, Calculator, MessageCircle, ChevronDown } from 'lucide-react';
import { categoryBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { CategoryIcon } from '@/components/category-icon';
import { cn } from '@/lib/utils';

const linkBase = 'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors duration-150 hover:bg-[#e0f5f7] hover:text-[#085041]';
const titleCls = 'mb-1.5 mt-4 border-l-2 border-teal-500 pl-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500';
const ico = 'h-[15px] w-[15px] shrink-0 text-[#2a9aa4]';

const BROWSE: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'All Jobs', href: '/jobs', icon: LayoutGrid },
  { label: 'Walk-in', href: '/jobs/walk-in-interview-dubai', icon: Footprints },
  { label: 'Urgent', href: '/jobs/urgent-hiring-uae', icon: Zap },
  { label: 'Visa Provided', href: '/jobs/visa-provided', icon: ShieldCheck },
  { label: 'Freshers', href: '/jobs/fresher-jobs-uae', icon: Sparkles },
  { label: 'Part Time', href: '/jobs/part-time-jobs-uae', icon: Clock },
];

const CAT_SLUGS = ['driving', 'healthcare', 'finance', 'it', 'hospitality', 'construction', 'education', 'admin'];

const TOOLS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'CV Builder', href: '/cv-builder', icon: FileText },
  { label: 'Salary Guide', href: '/salary-guide', icon: BarChart3 },
  { label: 'Scam Checker', href: '/tools/job-scam-checker', icon: ShieldAlert },
  { label: 'Gratuity Calc', href: '/wps-calculator', icon: Calculator },
];

export function HomeSidebar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const stats = trpc.jobs.stats.useQuery(undefined, { staleTime: 300_000 });
  const byCat = stats.data?.byCategory ?? {};
  const cats = trpc.content.categories.useQuery(undefined, { staleTime: 300_000 });
  // top-level active categories from DB (fallback to hardcoded list while loading)
  const allCats = cats.data ?? [];
  const dbCats = allCats.filter((c) => !c.parentId);
  // Subcategory names grouped under their parent's slug (names only — jobs aren't sub-tagged).
  const subsByParent: Record<string, string[]> = {};
  for (const c of allCats) {
    if (!c.parentId) continue;
    const p = dbCats.find((d) => d.id === c.parentId);
    if (p) (subsByParent[p.slug] ??= []).push(c.name);
  }
  const categoryList = dbCats.length
    ? dbCats.slice(0, 10).map((c) => ({ slug: c.slug, name: c.name }))
    : CAT_SLUGS.map((slug) => ({ slug, name: categoryBySlug(slug)?.name ?? slug }));

  const row = (active: boolean) => cn(linkBase, 'border-l-4 pl-3', active ? 'border-[#3a9ea5] bg-[#f0fafa] font-medium text-[#3a9ea5]' : 'border-transparent text-slate-600');
  // A subcategory link is "active" when the jobs list is filtered to that parent + keyword.
  const subActive = (parent: string, sub: string) =>
    pathname === '/jobs' && search.get('category') === parent && search.get('q') === sub;

  return (
    <div className="sticky top-20 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <nav className="space-y-0.5">
        {BROWSE.map((b) => {
          const Icon = b.icon;
          return (
            <Link key={b.href} href={b.href} className={row(pathname === b.href)}>
              <Icon className={ico} /><span className="flex-1 truncate">{b.label}</span>
            </Link>
          );
        })}
      </nav>

      <p className={titleCls}>Categories</p>
      <nav className="space-y-0.5">
        {categoryList.map(({ slug, name }) => {
          const iconName = categoryBySlug(slug)?.icon ?? 'briefcase';
          const n = byCat[slug] ?? 0;
          const subs = subsByParent[slug] ?? [];
          const isOpen = open[slug] ?? false;
          return (
            <div key={slug}>
              <div className={cn(row(pathname === `/category/${slug}`), 'pr-1')}>
                <CategoryIcon name={iconName} className={ico} />
                <Link href={`/category/${slug}`} className="flex-1 truncate">{name}</Link>
                {n > 0 && <span className="rounded bg-[#f0fdf4] px-1.5 text-xs font-medium text-green-700">{n}</span>}
                {subs.length > 0 && (
                  <button
                    type="button"
                    aria-label={isOpen ? `Collapse ${name}` : `Expand ${name}`}
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [slug]: !isOpen }))}
                    className="ml-0.5 shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                )}
              </div>
              {isOpen && subs.length > 0 && (
                <div className="mb-1 ml-[26px] space-y-0.5 border-l border-slate-100 pl-2">
                  {subs.map((sub) => (
                    <Link
                      key={sub}
                      href={`/jobs?category=${slug}&q=${encodeURIComponent(sub)}`}
                      className={cn(
                        'block truncate border-l-2 py-1 pl-2 text-[12px] transition-colors',
                        subActive(slug, sub)
                          ? 'border-[#3a9ea5] font-medium text-[#3a9ea5]'
                          : 'border-transparent text-slate-500 hover:text-[#3a9ea5]',
                      )}
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <p className={titleCls}>UAE Tools</p>
      <nav className="space-y-0.5">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className={row(pathname === t.href)}>
              <Icon className={ico} /><span className="flex-1 truncate">{t.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg bg-[#e8f8ee] p-3">
        <p className="text-sm font-bold text-navy-900">80,000+ members</p>
        <p className="text-xs text-navy-700/70">76 groups · Post jobs free</p>
        <Link href="/whatsapp-groups" className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1da851]">
          <MessageCircle className="h-4 w-4" /> Join community
        </Link>
      </div>
    </div>
  );
}
