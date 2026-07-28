import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { db, jobseekerProfiles, uploadScans } from '@ddots/db';
import { auth } from '@ddots/auth';
import { validateFileType, validateFileSize } from '@ddots/api/lib/file-validator';

const f = createUploadthing();

// CV endpoint accepts documents only (pdf/doc/docx, ≤4MB). Authoritative gate —
// the client onBeforeUploadBegin mirrors this for UX but must not be trusted.
const CV_TYPES = new Set(['pdf', 'doc', 'docx']);
function assertCvFilesAllowed(files: readonly { name: string; size: number; type?: string }[]): void {
  for (const file of files) {
    const t = validateFileType(file);
    if (!t.valid || !t.type || !CV_TYPES.has(t.type)) throw new UploadThingError(t.error ?? 'Only PDF or Word documents are allowed.');
    const s = validateFileSize(file, 4);
    if (!s.valid) throw new UploadThingError(s.error ?? 'File too large — max 4MB.');
  }
}

export const ourFileRouter = {
  cvUploader: f({
    pdf: { maxFileSize: '4MB', maxFileCount: 1 },
    'application/msword': { maxFileSize: '4MB', maxFileCount: 1 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxFileSize: '4MB', maxFileCount: 1 },
  })
    .middleware(async ({ files }) => {
      const session = await auth();
      if (!session?.user?.id) throw new UploadThingError('Unauthorized');
      assertCvFilesAllowed(files); // server-authoritative type/size gate (Phase 8A)
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // v7: prefer ufsUrl; fall back to url on older payloads.
      const url = (file as { ufsUrl?: string; url: string }).ufsUrl ?? file.url;
      // Upload-scan ledger (Phase 8A). No AV engine wired yet → status 'pending';
      // a future ClamAV worker flips this to clean/quarantined. Non-blocking.
      const ft = validateFileType(file).type ?? 'unknown';
      await db
        .insert(uploadScans)
        .values({
          fileName: file.name.slice(0, 512),
          fileType: ft.slice(0, 10),
          fileSizeBytes: file.size,
          scanStatus: 'pending',
          scanResult: { av_engine: 'none', threat_detected: false, timestamp: new Date().toISOString() },
          uploadedBy: metadata.userId,
        })
        .catch(() => {});
      // Upsert so a first-time uploader without a profile row still gets saved.
      await db
        .insert(jobseekerProfiles)
        .values({ userId: metadata.userId, resumeUrl: url, resumeFilename: file.name, resumeUploadedAt: new Date() })
        .onConflictDoUpdate({ target: jobseekerProfiles.userId, set: { resumeUrl: url, resumeFilename: file.name, resumeUploadedAt: new Date() } });
      // Metadata extraction is triggered explicitly by the client (cvs.parseCv) so it can show
      // a "Parsing CV…" loader; makeSearchable also re-parses on opt-in as a safety net.
      return { url, userId: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
