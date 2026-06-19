'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Footprints, Zap, ShieldCheck, Sparkles, Clock, FileText, BarChart3, ShieldAlert, Calculator } from 'lucide-react';
import { CATEGORIES, categoryBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { CategoryIcon } from '@/components/category-icon';
import { cn } from '@/lib/utils';

const linkBase = 'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors duration-150 hover:bg-[#e0f5f7] hover:text-[#085041]';
const titleCls = 'mb-1.5 mt-4 pl-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#64748b]';
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

  const row = (active: boolean) => cn(linkBase, active ? 'border-l-2 border-teal-500 bg-[#e0f5f7] pl-[6px] font-medium text-[#085041]' : 'text-navy-800');

  return (
    <div className="sticky top-20 bg-white">
      <p className={cn(titleCls, 'mt-0')}>Browse Jobs</p>
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
        {CAT_SLUGS.map((slug) => {
          const c = categoryBySlug(slug) ?? CATEGORIES.find((x) => x.slug === slug);
          if (!c) return null;
          const n = byCat[slug] ?? 0;
          return (
            <Link key={slug} href={`/category/${slug}`} className={row(pathname === `/category/${slug}`)}>
              <CategoryIcon name={c.icon} className={ico} /><span className="flex-1 truncate">{c.name}</span>
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
        <Link href="/whatsapp-groups" className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1da851]">
          Join community
        </Link>
      </div>
    </div>
  );
}
