import { NextResponse } from 'next/server';
import { db, shortLinks, sql, eq } from '@ddots/db';
import { SITE } from '@ddots/shared';

/** Short-link redirector: /s/<code> → original URL, counting clicks. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const link = await db.query.shortLinks.findFirst({ where: eq(shortLinks.code, code) });
    if (link) {
      // Fire-and-forget click increment.
      db.update(shortLinks).set({ clicks: sql`${shortLinks.clicks} + 1` }).where(eq(shortLinks.code, code)).catch(() => {});
      return NextResponse.redirect(link.url, 302);
    }
  } catch {
    /* fall through to home */
  }
  return NextResponse.redirect(`${SITE.url}/jobs`, 302);
}
