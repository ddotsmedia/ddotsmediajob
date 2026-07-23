import { describe, it, expect } from 'vitest';
import { parseJobDescription, extractLocations, extractSalaryRange } from './job-description-parser';

describe('job-description-parser — deterministic (audit Phase 3A)', () => {
  it('extracts years, location, salary from a structured JD', () => {
    const r = parseJobDescription('React, TypeScript, Node. 3+ years experience. Based in Dubai. Salary 10000 to 25000 AED.');
    expect(r.years_required).toBe(3);
    expect(r.preferred_locations).toContain('Dubai');
    expect(r.salary_range).toEqual({ min: 10000, max: 25000 });
  });

  it('extractLocations matches UAE emirates by name', () => {
    expect(extractLocations('role based in Abu Dhabi and Sharjah')).toEqual(expect.arrayContaining(['Abu Dhabi', 'Sharjah']));
    expect(extractLocations('remote worldwide')).toEqual([]);
  });

  it('extractSalaryRange handles ranges, single figures, commas', () => {
    expect(extractSalaryRange('AED 8000')).toEqual({ min: 8000, max: 8000 });
    expect(extractSalaryRange('10,000 - 20,000 AED')).toEqual({ min: 10000, max: 20000 });
    expect(extractSalaryRange('great team, no pay mentioned')).toBeNull();
  });

  it('normalizes reversed ranges (min <= max)', () => {
    expect(extractSalaryRange('25000 to 10000 AED')).toEqual({ min: 10000, max: 25000 });
  });
});
