import { validateFileType, validateFileSize } from '@ddots/api/lib/file-validator';

// CV endpoint accepts documents only (UploadThing cvUploader: 4MB pdf/doc/docx).
const CV_TYPES = new Set(['pdf', 'doc', 'docx']);
const CV_MAX_MB = 4;

/**
 * Client-side gate for UploadThing `onBeforeUploadBegin`. Throws with a friendly
 * message on the first bad file so nothing is sent to R2; the thrown message
 * surfaces via the button's onUploadError toast. Returns the files unchanged
 * when all pass. SVGs are rejected here (not a valid CV) — server-side
 * sanitizeSvg guards image endpoints that do accept them.
 */
export function validateCvUpload(files: File[]): File[] {
  for (const f of files) {
    const t = validateFileType(f);
    if (!t.valid || !t.type || !CV_TYPES.has(t.type)) {
      throw new Error(t.error ?? 'Upload a PDF or Word document.');
    }
    const s = validateFileSize(f, CV_MAX_MB);
    if (!s.valid) throw new Error(s.error ?? `File too large — max ${CV_MAX_MB}MB.`);
  }
  return files;
}
