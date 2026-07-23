import { describe, it, expect } from 'vitest';
import { canManageJob, canViewApplication, ownsOrAdmin, assertJobOwner, assertAppOwner } from './authz';

const owner = { id: 'u1', role: 'employer' };
const other = { id: 'u2', role: 'employer' };
const admin = { id: 'a1', role: 'admin' };
const seeker = { id: 's1', role: 'jobseeker' };

describe('canManageJob', () => {
  it('allows the owning employer', () => {
    expect(canManageJob({ employerId: 'u1' }, owner)).toBe(true);
  });
  // Denial cases (audit Phase 3 — every security test must include denials).
  it('DENIES a different employer (cross-tenant)', () => {
    expect(canManageJob({ employerId: 'u1' }, other)).toBe(false);
  });
  it('DENIES a jobseeker', () => {
    expect(canManageJob({ employerId: 'u1' }, seeker)).toBe(false);
  });
  it('DENIES when employerId is null and user is not admin', () => {
    expect(canManageJob({ employerId: null }, owner)).toBe(false);
  });
  it('allows any admin', () => {
    expect(canManageJob({ employerId: 'u1' }, admin)).toBe(true);
    expect(canManageJob({ employerId: null }, admin)).toBe(true);
  });
});

describe('canViewApplication', () => {
  it('allows the job owner', () => {
    expect(canViewApplication({ job: { employerId: 'u1' } }, owner)).toBe(true);
  });
  it('DENIES another employer', () => {
    expect(canViewApplication({ job: { employerId: 'u1' } }, other)).toBe(false);
  });
  it('DENIES a jobseeker', () => {
    expect(canViewApplication({ job: { employerId: 'u1' } }, seeker)).toBe(false);
  });
  it('allows admin', () => {
    expect(canViewApplication({ job: { employerId: 'u1' } }, admin)).toBe(true);
  });
});

describe('ownsOrAdmin', () => {
  it('allows owner and admin, denies others and null', () => {
    expect(ownsOrAdmin('u1', owner)).toBe(true);
    expect(ownsOrAdmin('u1', admin)).toBe(true);
    expect(ownsOrAdmin('u1', other)).toBe(false);
    expect(ownsOrAdmin(null, owner)).toBe(false);
  });
});

describe('assert wrappers throw FORBIDDEN on denial', () => {
  it('assertJobOwner throws for a different employer', () => {
    expect(() => assertJobOwner({ employerId: 'u1' }, other)).toThrowError(/FORBIDDEN/);
  });
  it('assertJobOwner passes for the owner', () => {
    expect(() => assertJobOwner({ employerId: 'u1' }, owner)).not.toThrow();
  });
  it('assertAppOwner throws for a different employer', () => {
    expect(() => assertAppOwner({ job: { employerId: 'u1' } }, other)).toThrowError(/FORBIDDEN/);
  });
});
