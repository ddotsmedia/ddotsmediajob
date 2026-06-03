'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, LayoutDashboard, LogOut, Briefcase } from 'lucide-react';
import { Logo } from './logo';
import { Button } from './ui/button';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/companies', label: 'Companies' },
  { href: '/salary-guide', label: 'Salary Guide' },
  { href: '/community', label: 'Community' },
  { href: '/whatsapp-groups', label: 'WhatsApp' },
  { href: '/blog', label: 'Blog' },
];

export function SiteHeader() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const role = session?.user?.role;
  const dashHref = role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-navy-700 hover:text-teal-600">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <>
              <NotificationBell />
              <Button asChild variant="ghost" size="sm">
                <Link href={dashHref}>
                  <LayoutDashboard /> Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
                <LogOut /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/employer/post">
                  <Briefcase /> Post a Job
                </Link>
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <div className={cn('border-t bg-white md:hidden', open ? 'block' : 'hidden')}>
        <nav className="flex flex-col gap-1 p-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t pt-3">
            {session ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={dashHref}>Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/employer/post">Post a Job</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
