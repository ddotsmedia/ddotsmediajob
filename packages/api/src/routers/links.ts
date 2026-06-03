import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { shortLinks, jobs, eq } from '@ddots/db';
import { router, publicProcedure } from '../trpc';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ddotsmediajobs.com';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function makeCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export const linksRouter = router({
  /** Get (or lazily create) a short link for a job. Public — anyone can share. */
  forJob: publicProcedure.input(z.object({ jobId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.shortLinks.findFirst({ where: eq(shortLinks.jobId, input.jobId) });
    if (existing) return { code: existing.code, shortUrl: `${APP_URL}/s/${existing.code}` };

    const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId), columns: { slug: true } });
    if (!job) throw new Error('Job not found');
    const url = `${APP_URL}/jobs/${job.slug}`;

    let code = makeCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db.query.shortLinks.findFirst({ where: eq(shortLinks.code, code) });
      if (!clash) break;
      code = makeCode();
    }
    await ctx.db.insert(shortLinks).values({ code, url, jobId: input.jobId });
    return { code, shortUrl: `${APP_URL}/s/${code}` };
  }),
});
