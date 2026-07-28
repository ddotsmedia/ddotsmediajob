// Upload validation + SVG sanitization (audit Phase 8A). PURE — no DB, no DOM,
// no Node APIs — runs on the client (pre-UploadThing) and in unit tests.
//
// SECURITY NOTE: this is defense-in-depth, NOT the sole control. Extension/MIME
// come from the client and can be spoofed, so validateFileType cannot guarantee
// real content type — magic-byte inspection + AV scanning happen server-side and
// are recorded in the upload_scans ledger. sanitizeSvg scrubs known active-content
// vectors but a real image endpoint should still store SVGs as attachments, never
// inline them from an untrusted origin.

/** Minimal file shape shared by the browser File and server payloads. */
export interface FileLike {
  name: string;
  type?: string; // MIME, when the caller has it
  size: number; // bytes
}

export type AllowedType = 'pdf' | 'doc' | 'docx' | 'jpg' | 'png' | 'svg';

const EXT_TO_TYPE: Record<string, AllowedType> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  svg: 'svg',
};

// MIME allow-list — kept in sync with EXT_TO_TYPE so a supplied MIME that
// disagrees with the extension is rejected (blocks the easy spoof).
const MIME_TO_TYPE: Record<string, AllowedType> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
};

export interface TypeResult {
  valid: boolean;
  type: AllowedType | null;
  error?: string;
}

export interface SizeResult {
  valid: boolean;
  sizeBytes: number;
  error?: string;
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/**
 * Allow pdf, doc, docx, jpg, png, svg only. Resolves by extension; if a MIME is
 * supplied it must map to the SAME type. NOTE: a client can omit/forge the MIME,
 * so a passing result is necessary-but-not-sufficient — the server still verifies
 * magic bytes + scans (see module note).
 */
export function validateFileType(file: FileLike): TypeResult {
  const ext = extOf(file.name);
  const byExt = EXT_TO_TYPE[ext];
  if (!byExt) {
    return { valid: false, type: null, error: `File type ".${ext || 'unknown'}" is not allowed. Use PDF, DOC, DOCX, JPG, PNG or SVG.` };
  }
  const mime = file.type?.toLowerCase().trim();
  // A supplied MIME must agree. If it names an allowed-but-different type OR any
  // other concrete image/app type, treat the mismatch as hostile.
  if (mime && mime !== 'application/octet-stream' && MIME_TO_TYPE[mime] !== byExt) {
    return { valid: false, type: null, error: 'File extension does not match its content type.' };
  }
  return { valid: true, type: byExt };
}

/** Reject empty and oversized files. maxMB defaults to 5. */
export function validateFileSize(file: FileLike, maxMB = 5): SizeResult {
  const sizeBytes = file.size;
  const max = maxMB * 1024 * 1024;
  if (sizeBytes <= 0) return { valid: false, sizeBytes, error: 'File is empty.' };
  if (sizeBytes > max) {
    const mb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return { valid: false, sizeBytes, error: `File is ${mb}MB — max ${maxMB}MB.` };
  }
  return { valid: true, sizeBytes };
}

// ─── SVG sanitization (regexes hoisted; compiled once) ───────────────────────
const DANGER_TAGS = ['script', 'foreignObject', 'iframe', 'object', 'embed', 'style', 'animate', 'animateTransform', 'set', 'handler', 'use'];
// Paired block (open→close) and standalone/self-closing forms of each tag.
const BLOCK_RES = DANGER_TAGS.map((t) => new RegExp(`<${t}\\b[\\s\\S]*?<\\/${t}\\s*>`, 'gi'));
const STANDALONE_RES = DANGER_TAGS.map((t) => new RegExp(`<${t}\\b[^>]*\\/?>`, 'gi'));
// Event handlers — boundary is whitespace OR the `/` attribute separator, so
// `<svg/onload=…>` is caught, not just `<svg onload=…>`.
const EVT_DQ = /[\s/]on[a-z]+\s*=\s*"[^"]*"/gi;
const EVT_SQ = /[\s/]on[a-z]+\s*=\s*'[^']*'/gi;
const EVT_BARE = /[\s/]on[a-z]+\s*=\s*[^\s>]+/gi;
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const DOCTYPE_RE = /<!DOCTYPE[\s\S]*?>/gi;
const ENTITY_RE = /<!ENTITY[\s\S]*?>/gi;
// Dangerous URI schemes tolerating interleaved whitespace / HTML entities
// (defeats `jav&#x09;ascript:`). SEP matches any run of ws or char/named entity.
const SEP = '(?:\\s|&#x?[0-9a-f]+;?|&[a-z]+;)*';
function schemeAlt(word: string): string {
  return word.split('').join(SEP);
}
const URI_SCHEME_RE = new RegExp(
  `((?:href|xlink:href|src)\\s*=\\s*)(["']?)\\s*(?:${schemeAlt('javascript')}|${schemeAlt('vbscript')}|${schemeAlt('data')})${SEP}:[^"'>\\s]*`,
  'gi',
);

/**
 * Strip active content from SVG markup: dangerous element blocks, inline on*
 * handlers (incl. the `/`-separated form), javascript:/vbscript:/data: URIs
 * (incl. entity-obfuscated), comments, and DOCTYPE/ENTITY (XXE / billion-laughs).
 * Runs removals to a fixpoint so split/nested tags that reform after one pass
 * (e.g. `<<script>script>`) are re-scanned. Never throws.
 */
export function sanitizeSvg(svgContent: string): string {
  let s = svgContent.replace(COMMENT_RE, '').replace(DOCTYPE_RE, '').replace(ENTITY_RE, '');
  // Fixpoint: keep stripping tag blocks until the string stops shrinking (cap 8).
  for (let i = 0; i < 8; i++) {
    const before = s;
    for (const re of BLOCK_RES) s = s.replace(re, '');
    for (const re of STANDALONE_RES) s = s.replace(re, '');
    if (s === before) break;
  }
  s = s.replace(EVT_DQ, '').replace(EVT_SQ, '').replace(EVT_BARE, '');
  s = s.replace(URI_SCHEME_RE, '$1$2#');
  return s;
}
