import { describe, it, expect } from 'vitest';
import { normalizeJobTitle, normalizeExperienceLevel } from './salary-normalizer';

describe('normalizeJobTitle', () => {
  it('strips seniority + punctuation → snake_case', () => {
    expect(normalizeJobTitle('Sr. Software Engineer')).toBe('software_engineer');
    expect(normalizeJobTitle('Junior Accountant')).toBe('accountant');
    expect(normalizeJobTitle('Lead UX Designer')).toBe('ux_designer');
    expect(normalizeJobTitle('  Marketing   Manager ')).toBe('marketing_manager');
  });
  it('same role at different seniorities normalizes equal', () => {
    expect(normalizeJobTitle('Senior Nurse')).toBe(normalizeJobTitle('Junior Nurse'));
  });
  it('empty → unknown', () => {
    expect(normalizeJobTitle('')).toBe('unknown');
    expect(normalizeJobTitle('   ')).toBe('unknown');
  });
});

describe('normalizeExperienceLevel', () => {
  it('maps year ranges to levels', () => {
    expect(normalizeExperienceLevel(0)).toBe('junior');
    expect(normalizeExperienceLevel(2)).toBe('junior');
    expect(normalizeExperienceLevel(3)).toBe('mid');
    expect(normalizeExperienceLevel(5)).toBe('mid');
    expect(normalizeExperienceLevel(6)).toBe('senior');
    expect(normalizeExperienceLevel(10)).toBe('senior');
    expect(normalizeExperienceLevel(11)).toBe('lead');
    expect(normalizeExperienceLevel(15)).toBe('lead');
    expect(normalizeExperienceLevel(16)).toBe('executive');
    expect(normalizeExperienceLevel(30)).toBe('executive');
  });
  it('handles negative/NaN safely', () => {
    expect(normalizeExperienceLevel(-5)).toBe('junior');
    expect(normalizeExperienceLevel(NaN)).toBe('junior');
  });
});
