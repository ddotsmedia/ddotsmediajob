'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Search, Bookmark, LayoutDashboard, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Fixed bottom navigation for mobile (≤ md). Hidden on dashboard sub-routes that have their own tabs. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const dashHref = role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/dashboard';

  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/jobs', label: 'Jobs', icon: Search },
    session
      ? { href: '/dashboard/saved', label: 'Saved', icon: Bookmark }
      : { href: '/employer/post', label: 'Post', icon: Briefcase },
    { href: dashHref, label: session ? 'Dashboard' : 'Sign in', icon: LayoutDashboard, fallback: '/login' },
  ];

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const href = !session && 'fallback' in item && item.fallback ? item.fallback : item.href;
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium active:scale-95',
                active ? 'text-teal-600' : 'text-navy-700/60',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
