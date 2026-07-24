import { describe, it, expect } from 'vitest';
import { canTransition, timestampFieldFor } from './job-state-machine';

describe('job-state-machine (audit Phase 5A)', () => {
  it('DRAFT → ACTIVE (publish)', () => {
    expect(canTransition('draft', 'active')).toBe(true);
  });
  it('ACTIVE → PAUSED (pause)', () => {
    expect(canTransition('active', 'paused')).toBe(true);
  });
  it('PAUSED → ACTIVE (resume)', () => {
    expect(canTransition('paused', 'active')).toBe(true);
  });
  it('ACTIVE/PAUSED → FILLED', () => {
    expect(canTransition('active', 'filled')).toBe(true);
    expect(canTransition('paused', 'filled')).toBe(true);
  });
  it('ANY → ARCHIVED', () => {
    for (const s of ['draft', 'pending', 'active', 'paused', 'filled', 'expired', 'closed', 'rejected'] as const) {
      expect(canTransition(s, 'archived')).toBe(true);
    }
  });
  it('rejects invalid transitions (FILLED → ACTIVE, ARCHIVED → anything, ACTIVE → DRAFT)', () => {
    expect(canTransition('filled', 'active')).toBe(false);
    expect(canTransition('archived', 'active')).toBe(false);
    expect(canTransition('archived', 'archived')).toBe(false);
    expect(canTransition('active', 'draft')).toBe(false);
  });
  it('timestampFieldFor maps status → column', () => {
    expect(timestampFieldFor('paused')).toBe('pausedAt');
    expect(timestampFieldFor('filled')).toBe('filledAt');
    expect(timestampFieldFor('archived')).toBe('archivedAt');
    expect(timestampFieldFor('active')).toBeNull();
  });
});
