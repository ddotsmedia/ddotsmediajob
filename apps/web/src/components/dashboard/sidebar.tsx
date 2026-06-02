'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavItem = { href: string; label: string; icon: LucideIcon };

export function DashboardSidebar({ items, title }: { items: NavItem[]; title: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-white lg:block">
      <div className="sticky top-16 p-4">
        <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-navy-700/40">{title}</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/employer' && item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-teal-50 text-teal-700' : 'text-navy-700 hover:bg-navy-50',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function MobileTabs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto border-b bg-white px-2 lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium',
              active ? 'border-teal-500 text-teal-700' : 'border-transparent text-navy-700',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
