/**
 * Deterministic ATS scoring (Phase 2A). No AI — pure, reproducible, unit-testable.
 * Same inputs always yield the same score.
 */

export type CvForScore = { skills: string[]; experience_years: number };
export type AtsScore = {
  keyword_match_pct: number;
  experience_match_pct: number;
  combined_score_pct: number;
  matched_skills: string[];
  missing_skills: string[];
};

const norm = (s: string) => s.trim().toLowerCase();

/** Required skills from a job description: comma/newline/semicolon-separated list, deduped. */
export function extractRequiredSkills(jobDescription: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of jobDescription.split(/[,\n;•|]/)) {
    const s = norm(raw).replace(/\.$/, '');
    if (s.length >= 2 && s.length <= 50 && !/\d+\s*years?/.test(s) && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/** Years required from a job description (first "N years" match), or null if unspecified. */
export function extractYearsRequired(jobDescription: string): number | null {
  const m = jobDescription.match(/(\d{1,2})\s*\+?\s*years?/i);
  return m ? Number(m[1]) : null;
}

/** A skill matches if either token contains the other (case-insensitive) — "react" ⇄ "react.js". */
const skillMatches = (required: string, cvSkill: string) => cvSkill.includes(required) || required.includes(cvSkill);

export function scoreCV(cv: CvForScore, jobDescription: string): AtsScore {
  const required = extractRequiredSkills(jobDescription);
  const cvSkills = (cv.skills ?? []).map(norm).filter(Boolean);

  const matched: string[] = [];
  const missing: string[] = [];
  for (const r of required) {
    if (cvSkills.some((cs) => skillMatches(r, cs))) matched.push(r);
    else missing.push(r);
  }
  const keyword_match_pct = required.length === 0 ? 0 : Math.round((matched.length / required.length) * 100);

  const yearsReq = extractYearsRequired(jobDescription);
  const experience_match_pct =
    yearsReq === null || yearsReq === 0 ? 100 : Math.min(100, Math.round(((cv.experience_years ?? 0) / yearsReq) * 100));

  const combined_score_pct = Math.round(keyword_match_pct * 0.6 + experience_match_pct * 0.4);
  return { keyword_match_pct, experience_match_pct, combined_score_pct, matched_skills: matched, missing_skills: missing };
}

/**
 * Filter-based score when no job description is given: overlap between the searched-for
 * skills and the CV's skills. Deterministic. Experience left at 100 (no requirement).
 */
export function scoreBySkillOverlap(cv: CvForScore, searchedSkills: string[]): AtsScore {
  const wanted = (searchedSkills ?? []).map(norm).filter(Boolean);
  if (wanted.length === 0) return { keyword_match_pct: 0, experience_match_pct: 100, combined_score_pct: 0, matched_skills: [], missing_skills: [] };
  const cvSkills = (cv.skills ?? []).map(norm).filter(Boolean);
  const matched = wanted.filter((w) => cvSkills.some((cs) => skillMatches(w, cs)));
  const missing = wanted.filter((w) => !matched.includes(w));
  const keyword_match_pct = Math.round((matched.length / wanted.length) * 100);
  return { keyword_match_pct, experience_match_pct: 100, combined_score_pct: keyword_match_pct, matched_skills: matched, missing_skills: missing };
}
