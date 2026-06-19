'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Footprints, Zap, ShieldCheck, Sparkles, Clock, MapPin } from 'lucide-react';
import { CATEGORIES, EMIRATES, categoryBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { CategoryIcon } from '@/components/category-icon';
import { cn } from '@/lib/utils';

const linkBase = 'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors duration-150 hover:bg-[rgba(42,154,164,0.08)]';
const titleCls = 'mb-1.5 mt-4 border-l-2 border-teal-500 pl-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500';

function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="ml-auto rounded bg-[#f0fdf4] px-1.5 text-xs font-medium text-green-700">{n}</span>;
}

export function JobsNavSidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const cat = params.get('category');
  const em = params.get('emirate');
  const onPlainJobs = pathname === '/jobs';
  const stats = trpc.jobs.stats.useQuery(undefined, { staleTime: 300_000 });
  const byCat = stats.data?.byCategory ?? {};
  const byEm = stats.data?.byEmirate ?? {};
  const total = stats.data?.totalActive ?? 0;
  const catsQ = trpc.content.categories.useQuery(undefined, { staleTime: 300_000 });
  const dbCats = (catsQ.data ?? []).filter((c) => !c.parentId);
  const categoryList = dbCats.length ? dbCats.map((c) => ({ slug: c.slug, name: c.name })) : CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }));

  const row = (active: boolean) => cn(linkBase, active ? 'border-l-2 border-[#2a9aa4] bg-[#e0f5f7] pl-[6px] font-medium text-[#085041]' : 'text-navy-800');
  const ico = 'h-[15px] w-[15px] shrink-0 text-[#2a9aa4]';

  const browse: { label: string; href: string; icon: LucideIcon; count?: number; active: boolean }[] = [
    { label: 'All Jobs', href: '/jobs', icon: LayoutGrid, count: total, active: onPlainJobs && !cat && !em },
    { label: 'Walk-in Interviews', href: '/jobs/walk-in-interview-dubai', icon: Footprints, active: pathname === '/jobs/walk-in-interview-dubai' },
    { label: 'Urgent Hiring', href: '/jobs/urgent-hiring-uae', icon: Zap, active: pathname === '/jobs/urgent-hiring-uae' },
    { label: 'Visa Provided', href: '/jobs/visa-provided', icon: ShieldCheck, active: pathname === '/jobs/visa-provided' },
    { label: 'Freshers Only', href: '/jobs/fresher-jobs-uae', icon: Sparkles, active: pathname === '/jobs/fresher-jobs-uae' },
    { label: 'Part Time', href: '/jobs/part-time-jobs-uae', icon: Clock, active: pathname === '/jobs/part-time-jobs-uae' },
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className={cn(titleCls, 'mt-0')}>Browse</p>
      <nav className="space-y-0.5">
        {browse.map((b) => {
          const Icon = b.icon;
          return (
            <Link key={b.href} href={b.href} className={row(b.active)}>
              <Icon className={ico} /><span className="flex-1 truncate">{b.label}</span><CountBadge n={b.count ?? 0} />
            </Link>
          );
        })}
      </nav>

      <p className={titleCls}>Categories</p>
      <nav className="space-y-0.5">
        {categoryList.map((c) => (
          <Link key={c.slug} href={`/jobs?category=${c.slug}`} className={row(onPlainJobs && cat === c.slug)}>
            <CategoryIcon name={categoryBySlug(c.slug)?.icon ?? 'briefcase'} className={ico} /><span className="flex-1 truncate">{c.name}</span><CountBadge n={byCat[c.slug] ?? 0} />
          </Link>
        ))}
      </nav>

      <p className={titleCls}>By Emirate</p>
      <nav className="space-y-0.5">
        {EMIRATES.map((e) => (
          <Link key={e.slug} href={`/jobs?emirate=${e.slug}`} className={row(onPlainJobs && em === e.slug)}>
            <MapPin className={ico} /><span className="flex-1 truncate">{e.name}</span><CountBadge n={byEm[e.slug] ?? 0} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
