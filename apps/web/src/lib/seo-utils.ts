/** Google renders roughly 60 characters of a title in results. */
export const TITLE_MAX = 60;
/** Google renders roughly 155 characters of a description. */
export const DESCRIPTION_MAX = 155;

/** " | DdotsMediaJobs" — what the root layout's template appends. */
export const BRAND_SUFFIX_LENGTH = 18;

/**
 * Shorten a title to `maxChars` at a word boundary.
 *
 * For RUNTIME titles only — job titles, company names, search terms, anything
 * built from data. Hardcoded page titles should be written short instead:
 * truncation always loses meaning, and an ellipsis in a result listing reads as
 * a defect rather than a deliberate choice.
 *
 * Never cuts mid-word, and never returns a stub: if trimming to a word boundary
 * leaves less than half the budget, the text is returned untouched and the
 * caller's copy needs to change.
 */
export function truncateTitle(title: string, maxChars: number = TITLE_MAX): string {
  const clean = title.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxChars) return clean;

  // -1 leaves room for the ellipsis character (one char, not three dots).
  const words = clean.slice(0, maxChars - 1).split(' ');
  // No space inside the budget means there is no word boundary to cut at —
  // truncating anyway would slice through the middle of a word.
  if (words.length < 2) return clean;
  words.pop(); // drop the word the cut landed inside
  const trimmed = words.join(' ').replace(/[\s,;:—–-]+$/, '');

  // Too short to be useful, or still over budget (one very long leading word):
  // the caller's copy has to change; don't emit a stub or an oversized string.
  if (trimmed.length < maxChars / 2 || trimmed.length > maxChars - 1) return clean;
  return `${trimmed}…`;
}

/**
 * True when a title would overflow once the root layout appends the brand.
 * Use it to decide whether a page needs `title: { absolute: … }`.
 */
export function overflowsWithBrand(title: string, maxChars: number = TITLE_MAX): boolean {
  return title.length + BRAND_SUFFIX_LENGTH > maxChars;
}

/** Shorten a description at a word boundary, same rules as titles. */
export function truncateDescription(text: string, maxChars: number = DESCRIPTION_MAX): string {
  return truncateTitle(text, maxChars);
}
