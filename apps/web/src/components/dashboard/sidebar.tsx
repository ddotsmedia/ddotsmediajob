'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
export type SidebarVariant = 'light' | 'dark';

const ROOTS = ['/dashboard', '/employer', '/admin', '/volunteer'];

export function DashboardSidebar({ items, title, variant = 'light' }: { items: NavItem[]; title: string; variant?: SidebarVariant }) {
  const pathname = usePathname();
  const dark = variant === 'dark';
  return (
    <aside className={cn('hidden w-60 shrink-0 border-r lg:block', dark ? 'border-navy-800 bg-navy-900' : 'bg-white')}>
      <div className="sticky top-16 p-4">
        <p className={cn('px-3 pb-2 text-xs font-bold uppercase tracking-wider', dark ? 'text-white/40' : 'text-navy-700/40')}>{title}</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || (!ROOTS.includes(item.href) && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  dark
                    ? active
                      ? 'bg-teal-500/15 text-teal-300'
                      : 'text-navy-100/70 hover:bg-white/5 hover:text-white'
                    : active
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-navy-700 hover:bg-navy-50',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function MobileTabs({ items, variant = 'light' }: { items: NavItem[]; variant?: SidebarVariant }) {
  const pathname = usePathname();
  const dark = variant === 'dark';
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b px-2 lg:hidden', dark ? 'border-navy-800 bg-navy-900' : 'bg-white')}>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium',
              dark
                ? active
                  ? 'border-teal-400 text-teal-300'
                  : 'border-transparent text-navy-100/70'
                : active
                  ? 'border-teal-500 text-teal-700'
                  : 'border-transparent text-navy-700',
            )}
          >
            {item.label}
            {item.badge ? <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white">{item.badge}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
