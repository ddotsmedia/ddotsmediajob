/**
 * Deterministic salary data normalization (Phase 6A). Pure — no DB, no AI. Reusable.
 */

export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'lead' | 'executive';

// Seniority words to strip from a job title before normalizing (they're captured by level).
const SENIORITY = /\b(sr|snr|senior|jr|jnr|junior|lead|principal|chief|head|staff|entry[-\s]?level|mid[-\s]?level|assistant|associate)\b\.?/g;

/** "Sr. Software Engineer" → "software_engineer". Collapses to snake_case, drops seniority + punctuation. */
export function normalizeJobTitle(input: string): string {
  const t = (input ?? '')
    .toLowerCase()
    .replace(SENIORITY, ' ')
    .replace(/[^a-z0-9\s]/g, ' ') // drop punctuation
    .replace(/\s+/g, ' ')
    .trim();
  return t ? t.replace(/\s/g, '_') : 'unknown';
}

/** Years of experience → level. junior 0-2, mid 3-5, senior 6-10, lead 11-15, executive 15+. */
export function normalizeExperienceLevel(years: number): ExperienceLevel {
  const y = Number.isFinite(years) ? Math.max(0, years) : 0;
  if (y <= 2) return 'junior';
  if (y <= 5) return 'mid';
  if (y <= 10) return 'senior';
  if (y <= 15) return 'lead';
  return 'executive';
}

export const EXPERIENCE_LEVELS_SALARY: ExperienceLevel[] = ['junior', 'mid', 'senior', 'lead', 'executive'];
