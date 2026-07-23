import { EMIRATES } from '@ddots/shared';
import { extractRequiredSkills, extractYearsRequired } from './ats-scorer';

/**
 * Deterministic job-description extraction (Phase 3A). No AI — pure, reproducible, reusable.
 * Reuses the ATS scorer's skill/years extractors so search and posting stay consistent.
 */
export type JobExtraction = {
  required_skills: string[];
  years_required: number | null;
  preferred_locations: string[];
  salary_range: { min: number; max: number } | null;
};

/** UAE emirates mentioned in the text (by name), deduped, original casing from EMIRATES. */
export function extractLocations(text: string): string[] {
  const lower = text.toLowerCase();
  return EMIRATES.filter((e) => lower.includes(e.name.toLowerCase()) || lower.includes(e.slug)).map((e) => e.name);
}

/**
 * Salary range in AED. Matches "10000 to 50000 AED", "10,000-50,000 AED", "AED 10000".
 * Returns {min,max} (single figure → min=max). null if none found.
 */
export function extractSalaryRange(text: string): { min: number; max: number } | null {
  const clean = text.replace(/,/g, '');
  const num = (s: string) => parseInt(s, 10);
  // Range: two numbers joined by to/-/– near AED (either side).
  const range = clean.match(/(?:aed\s*)?(\d{3,7})\s*(?:to|-|–|—)\s*(\d{3,7})\s*(?:aed|dhs?|dirhams?)?/i);
  if (range && (/aed|dhs?|dirham/i.test(range[0]) || /aed|dhs?|dirham/i.test(clean))) {
    const min = num(range[1]!);
    const max = num(range[2]!);
    return { min: Math.min(min, max), max: Math.max(min, max) };
  }
  // Single figure with a currency marker.
  const single = clean.match(/(?:aed|dhs?|dirhams?)\s*(\d{3,7})|(\d{3,7})\s*(?:aed|dhs?|dirhams?)/i);
  if (single) {
    const v = num(single[1] ?? single[2]!);
    return { min: v, max: v };
  }
  return null;
}

export function parseJobDescription(description: string): JobExtraction {
  const text = description ?? '';
  return {
    required_skills: extractRequiredSkills(text),
    years_required: extractYearsRequired(text),
    preferred_locations: extractLocations(text),
    salary_range: extractSalaryRange(text),
  };
}
