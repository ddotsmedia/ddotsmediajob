import { describe, it, expect } from 'vitest';
import { scoreCV, scoreBySkillOverlap, extractRequiredSkills, extractYearsRequired } from './ats-scorer';

describe('ats-scorer — deterministic (audit Phase 2A)', () => {
  const cv = { skills: ['React', 'Node.js', 'TypeScript'], experience_years: 5 };

  it('keyword% is matched/required', () => {
    const s = scoreCV(cv, 'React, Python, 3 years');
    expect(s.keyword_match_pct).toBe(50); // React matched, Python missing
    expect(s.matched_skills).toContain('react');
    expect(s.missing_skills).toContain('python');
  });

  it('experience% caps at 100 (5y vs 3y required)', () => {
    expect(scoreCV(cv, 'React, 3 years').experience_match_pct).toBe(100);
  });

  it('under-experience is proportional (2y vs 4y = 50%)', () => {
    expect(scoreCV({ skills: ['react'], experience_years: 2 }, 'React, 4 years').experience_match_pct).toBe(50);
  });

  it('combined = 0.6*keyword + 0.4*experience', () => {
    expect(scoreCV(cv, 'React, Python, 3 years').combined_score_pct).toBe(70); // .6*50 + .4*100
  });

  it('no years required -> experience 100', () => {
    expect(scoreCV(cv, 'React').experience_match_pct).toBe(100);
  });

  it('is reproducible (same input, same output)', () => {
    const a = JSON.stringify(scoreCV(cv, 'React, Python, 3 years'));
    const b = JSON.stringify(scoreCV(cv, 'React, Python, 3 years'));
    expect(a).toBe(b);
  });

  it('scoreBySkillOverlap works without a JD', () => {
    expect(scoreBySkillOverlap(cv, ['react', 'php']).keyword_match_pct).toBe(50);
  });

  it('extractYearsRequired pulls the first N years', () => {
    expect(extractYearsRequired('minimum 4 years experience')).toBe(4);
    expect(extractYearsRequired('no requirement')).toBeNull();
  });

  it('extractRequiredSkills splits comma lists and drops the years phrase', () => {
    expect(extractRequiredSkills('react, node, 3 years')).toEqual(['react', 'node']);
  });
});
