'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, LayoutDashboard, LogOut, Briefcase, MessageCircle } from 'lucide-react';
import { Logo } from './logo';
import { Button } from './ui/button';
import { NotificationBell } from './notification-bell';
import { DesktopMegaNav, MobileMegaNav } from './mega-nav';
import { useLocale } from '@/lib/i18n';

function LangToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
      className="rounded-md border border-navy-200 px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50"
      aria-label="Toggle language"
    >
      {locale === 'ar' ? 'EN' : 'عربي'}
    </button>
  );
}

export function SiteHeader() {
  const { data: session } = useSession();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const role = session?.user?.role;
  const dashHref = role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : role === 'volunteer' ? '/volunteer' : '/dashboard';

  // Lock background scroll while the mobile menu is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="bg-navy-900 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-xs font-semibold sm:justify-end sm:text-sm">
            <a href="https://wa.me/971509379212" target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1.5 truncate hover:text-[#25D366]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25D366]"><MessageCircle className="h-3 w-3 text-white" /></span>
              <span className="hidden sm:inline">WhatsApp us:</span> <span className="text-[#25D366]">+971 50 937 9212</span>
            </a>
          </div>
        </div>

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Logo />
            <DesktopMegaNav />
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <LangToggle />
            <Button asChild variant="accent" size="sm">
              <Link href="/employer/post"><Briefcase /> {t('nav.postJob')}</Link>
            </Button>
            {session ? (
              <>
                <NotificationBell />
                <Button asChild variant="ghost" size="sm"><Link href={dashHref}><LayoutDashboard /> {t('nav.dashboard')}</Link></Button>
                <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}><LogOut /> {t('nav.signout')}</Button>
              </>
            ) : (
              <>
                <span className="mx-1 h-5 w-px bg-navy-100" />
                <Button asChild variant="outline" size="sm"><Link href="/login">{t('nav.login')}</Link></Button>
                <Button asChild variant="accent" size="sm"><Link href="/register">{t('nav.signup')}</Link></Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <LangToggle />
          </div>
          <button type="button" className="flex h-11 w-11 items-center justify-center md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile menu — outside <header> (header's backdrop-blur traps fixed children). */}
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white md:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <Logo />
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center"><X className="h-6 w-6 text-navy-700" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MobileMegaNav onNavigate={() => setOpen(false)} />
            <div className="flex flex-col gap-3 border-t p-4">
              {session ? (
                <>
                  <Button asChild variant="accent" className="w-full py-6 text-base"><Link href={dashHref} onClick={() => setOpen(false)}>Dashboard</Link></Button>
                  <Button variant="outline" className="w-full py-6 text-base" onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}>Sign out</Button>
                </>
              ) : (
                <>
                  <Button asChild variant="accent" className="w-full py-6 text-base"><Link href="/register" onClick={() => setOpen(false)}>Sign up</Link></Button>
                  <Button asChild variant="outline" className="w-full py-6 text-base"><Link href="/login" onClick={() => setOpen(false)}>Log in</Link></Button>
                  <Button asChild variant="ghost" className="w-full py-6 text-base"><Link href="/employer/post" onClick={() => setOpen(false)}>Post a Job</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
