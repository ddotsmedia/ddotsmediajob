import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { db, jobseekerProfiles, users, eq } from '@ddots/db';
import { auth } from '@ddots/auth';
import { parseResume } from '@ddots/api/lib/resume-parser';

const f = createUploadthing();

export const ourFileRouter = {
  cvUploader: f({
    pdf: { maxFileSize: '4MB', maxFileCount: 1 },
    'application/msword': { maxFileSize: '4MB', maxFileCount: 1 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxFileSize: '4MB', maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new UploadThingError('Unauthorized');
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // v7: prefer ufsUrl; fall back to url on older payloads.
      const url = (file as { ufsUrl?: string; url: string }).ufsUrl ?? file.url;
      // Upsert so a first-time uploader without a profile row still gets saved.
      await db
        .insert(jobseekerProfiles)
        .values({ userId: metadata.userId, resumeUrl: url, resumeFilename: file.name, resumeUploadedAt: new Date() })
        .onConflictDoUpdate({ target: jobseekerProfiles.userId, set: { resumeUrl: url, resumeFilename: file.name, resumeUploadedAt: new Date() } });
      // Auto-extract CV metadata in the background for employer CV search (pm2 keeps the
      // process alive, so fire-and-forget is safe here). parseResume never throws.
      void parseResume(url).then((meta) =>
        db.update(users).set({ cvMetadata: meta }).where(eq(users.id, metadata.userId)),
      ).catch((e) => console.error('[cvUploader] metadata parse failed:', e instanceof Error ? e.message : e));
      return { url, userId: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
