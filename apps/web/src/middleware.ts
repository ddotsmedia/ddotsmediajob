import { auth } from '@ddots/auth';
import { NextResponse } from 'next/server';

/**
 * Route protection: gate dashboards by auth + role.
 * Public pages (jobs, categories, blog, etc.) are untouched.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  const isAuthed = Boolean(user);
  const role = user?.role;

  const needsAuth =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/employer') ||
    pathname.startsWith('/admin');

  if (needsAuth && !isAuthed) {
    const url = new URL('/login', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  }

  // Any logged-in user may reach the Post-a-Job page — posting auto-upgrades them to employer.
  if (pathname.startsWith('/employer') && pathname !== '/employer/post' && role !== 'employer' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin));
  }

  // /dashboard is the jobseeker home — send other roles to their own panel.
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const home = role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : role === 'volunteer' ? '/volunteer' : null;
    if (home) return NextResponse.redirect(new URL(home, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/employer/:path*', '/admin/:path*'],
};
