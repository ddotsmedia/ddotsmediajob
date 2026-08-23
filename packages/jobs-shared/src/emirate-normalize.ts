import { EMIRATE_SLUGS } from './constants';

/**
 * Canonical emirate-slug normalisation.
 *
 * Emirates arrive from AI extraction, CSV, WhatsApp and hand-typed URLs as
 * "DUBAI", "Abu Dhabi", "RAK" and similar. `jobFieldsSchema.emirateSlug` is a
 * zod enum over the lowercase slugs, so an un-normalised value throws
 * "Invalid enum value ... received 'DUBAI'" at job creation.
 *
 * One implementation, because there were three subtly different ones and they
 * disagreed — see resolveEmirate in whatsapp/createJob, which did not lowercase
 * and therefore filed "SHARJAH" under Dubai.
 */
const ALIASES: Record<string, string> = {
  dxb: 'dubai',
  auh: 'abu-dhabi',
  abudhabi: 'abu-dhabi',
  shj: 'sharjah',
  ajm: 'ajman',
  rak: 'ras-al-khaimah',
  rasalkhaimah: 'ras-al-khaimah',
  fuj: 'fujairah',
  uaq: 'umm-al-quwain',
  ummalquwain: 'umm-al-quwain',
};

/**
 * Lowercase, trim and dash-collapse an emirate value.
 *
 * Returns the input's normalised form even when it isn't a real emirate —
 * validation stays the caller's job (see `toEmirateSlug` for the strict form).
 */
export function normalizeEmirateValue(v: string): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Strict: a canonical slug, or null when the value is not an emirate.
 * Accepts slugs, display names ("Abu Dhabi") and common abbreviations ("RAK").
 */
export function toEmirateSlug(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const dashed = normalizeEmirateValue(raw);
  if (!dashed) return null;
  if ((EMIRATE_SLUGS as readonly string[]).includes(dashed)) return dashed;
  // Abbreviations are compared without separators so "ras al khaimah",
  // "ras-al-khaimah" and "rasalkhaimah" all resolve.
  const compact = dashed.replace(/-/g, '');
  return ALIASES[compact] ?? null;
}

/** True when the value resolves to a real emirate. */
export function isEmirateSlug(raw: string | null | undefined): boolean {
  return toEmirateSlug(raw) !== null;
}
