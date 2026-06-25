'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Footprints, Zap, ShieldCheck, Sparkles, Clock, FileText, BarChart3, ShieldAlert, Calculator, MessageCircle } from 'lucide-react';
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
  const stats = trpc.jobs.stats.useQuery(undefined, { staleTime: 300_000 });
  const byCat = stats.data?.byCategory ?? {};
  const cats = trpc.content.categories.useQuery(undefined, { staleTime: 300_000 });
  // top-level active categories from DB (fallback to hardcoded list while loading)
  const dbCats = (cats.data ?? []).filter((c) => !c.parentId);
  const categoryList = dbCats.length
    ? dbCats.slice(0, 10).map((c) => ({ slug: c.slug, name: c.name }))
    : CAT_SLUGS.map((slug) => ({ slug, name: categoryBySlug(slug)?.name ?? slug }));

  const row = (active: boolean) => cn(linkBase, 'border-l-4 pl-3', active ? 'border-[#3a9ea5] bg-[#f0fafa] font-medium text-[#3a9ea5]' : 'border-transparent text-slate-600');

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
          return (
            <Link key={slug} href={`/category/${slug}`} className={row(pathname === `/category/${slug}`)}>
              <CategoryIcon name={iconName} className={ico} /><span className="flex-1 truncate">{name}</span>
              {n > 0 && <span className="ml-auto rounded bg-[#f0fdf4] px-1.5 text-xs font-medium text-green-700">{n}</span>}
            </Link>
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
