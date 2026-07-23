import { describe, it, expect } from 'vitest';
import { salaryState, salaryBadge, employerName } from './index';

describe('salaryState', () => {
  it('range vs fixed', () => {
    expect(salaryState(10000, 20000)).toBe('DISCLOSED_RANGE');
    expect(salaryState(10000, 10000)).toBe('DISCLOSED_FIXED');
    expect(salaryState(10000, null)).toBe('DISCLOSED_FIXED');
  });
  it('treats 0/null as no figure', () => {
    expect(salaryState(null, null)).toBe('NOT_DISCLOSED');
    expect(salaryState(0, 0)).toBe('NOT_DISCLOSED');
  });
  it('hidden wins over numbers', () => {
    expect(salaryState(10000, 20000, true)).toBe('ON_APPLICATION');
    expect(salaryState(null, null, true)).toBe('ON_APPLICATION');
  });
  it('negotiable only when no figure and not hidden', () => {
    expect(salaryState(null, null, false, true)).toBe('NEGOTIABLE');
  });
});

describe('salaryBadge — never claims "Salary shown" without a figure (audit C4)', () => {
  it('no numbers -> not disclosed, NOT success', () => {
    const b = salaryBadge(null, null);
    expect(b.label).toBe('Salary not disclosed');
    expect(b.tone).not.toBe('success');
  });
  it('real range -> Salary shown / success', () => {
    expect(salaryBadge(10000, 20000)).toEqual({ label: 'Salary shown', tone: 'success' });
  });
  it('hidden -> Apply to see salary', () => {
    expect(salaryBadge(10000, 20000, true).label).toBe('Apply to see salary');
  });
});

describe('employerName — confidential-safe (audit Phase 6/11)', () => {
  it('anonymous never leaks the real company name', () => {
    expect(employerName({ isAnonymous: true, company: { name: 'Acme LLC' } })).toBe('Confidential Company');
  });
  it('uses the company name when present', () => {
    expect(employerName({ company: { name: 'Acme LLC' } })).toBe('Acme LLC');
  });
  it('neutral label when no company', () => {
    expect(employerName({ company: null })).toBe('Direct Employer');
    expect(employerName({ company: { name: '   ' } })).toBe('Direct Employer');
  });
});
