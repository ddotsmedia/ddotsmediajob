'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, LayoutDashboard, LogOut, Briefcase, MessageCircle } from 'lucide-react';
import { Logo } from './logo';
import { Button } from './ui/button';
import { NotificationBell } from './notification-bell';
import { trpc } from '@/trpc/react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/companies', label: 'Companies' },
  { href: '/community', label: 'Community', key: 'community_visible' },
  { href: '/whatsapp-groups', label: 'WhatsApp', key: 'whatsapp_groups_visible' },
  { href: '/blog', label: 'Blog', key: 'blog_visible' },
  { href: '/salary-guide', label: 'Salary Guide', key: 'salary_guide_visible' },
] as const;

export function SiteHeader() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const visibility = trpc.content.pageVisibility.useQuery(undefined, { staleTime: 60_000 });
  const nav = NAV.filter((i) => !('key' in i) || visibility.data?.[i.key as keyof typeof visibility.data] !== false);
  const role = session?.user?.role;
  const dashHref = role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
      <div className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-sm font-semibold sm:justify-end">
          <a href="https://wa.me/971509379212" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[#25D366]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366]">
              <MessageCircle className="h-3 w-3 text-white" />
            </span>
            WhatsApp us: <span className="text-[#25D366]">+971 50 937 9212</span>
          </a>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => (
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
                <Link href="/employer/post">
                  <Briefcase /> Post a Job
                </Link>
              </Button>
              <span className="mx-1 h-5 w-px bg-navy-100" />
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="accent" size="sm">
                <Link href="/register">Sign up</Link>
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
          {nav.map((item) => (
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
                <Button asChild variant="accent" size="sm">
                  <Link href="/register" onClick={() => setOpen(false)}>Sign up</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/employer/post" onClick={() => setOpen(false)}>Post a Job</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
