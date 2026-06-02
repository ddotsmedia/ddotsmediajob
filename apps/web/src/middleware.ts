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

  if (pathname.startsWith('/employer') && role !== 'employer' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/employer/:path*', '/admin/:path*'],
};
