import { describe, it, expect } from 'vitest';
import { JOB_STATUS } from '@ddots/shared';
import { canTransition, allowedTransitions, isNoopTransition, timestampFieldFor } from './job-state-machine';

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

describe('admin moderation policy', () => {
  it('allows the moderation queue moves the employer policy forbids', () => {
    // This is why admin routes cannot reuse the employer map.
    expect(canTransition('pending', 'rejected', 'admin')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(false); // employer default
  });

  it('approves: pending → active', () => {
    expect(canTransition('pending', 'active', 'admin')).toBe(true);
  });

  it('sends a pending job back to draft for edits', () => {
    expect(canTransition('pending', 'draft', 'admin')).toBe(true);
  });

  it('re-reviews a rejected job', () => {
    expect(canTransition('rejected', 'pending', 'admin')).toBe(true);
    expect(canTransition('rejected', 'active', 'admin')).toBe(true);
  });

  it('takes a live job down', () => {
    expect(canTransition('active', 'rejected', 'admin')).toBe(true);
    expect(canTransition('active', 'expired', 'admin')).toBe(true);
  });

  it('relists an expired job and reopens a closed one', () => {
    expect(canTransition('expired', 'active', 'admin')).toBe(true);
    expect(canTransition('closed', 'active', 'admin')).toBe(true);
  });

  it('keeps archived terminal for admins too', () => {
    for (const s of JOB_STATUS) {
      expect(canTransition('archived', s, 'admin'), `archived → ${s}`).toBe(false);
    }
  });

  it('still refuses nonsense an admin should not do', () => {
    expect(canTransition('draft', 'filled', 'admin')).toBe(false);
    expect(canTransition('draft', 'paused', 'admin')).toBe(false);
    expect(canTransition('closed', 'pending', 'admin')).toBe(false);
  });

  it('never lists the current status as an onward transition', () => {
    for (const s of JOB_STATUS) {
      expect(allowedTransitions(s, 'admin'), s).not.toContain(s);
      expect(allowedTransitions(s, 'employer'), s).not.toContain(s);
    }
  });

  it('only ever offers real statuses', () => {
    for (const s of JOB_STATUS) {
      for (const t of allowedTransitions(s, 'admin')) {
        expect(JOB_STATUS, `${s} → ${t}`).toContain(t);
      }
    }
  });

  it('leaves the employer policy byte-identical (no behaviour change)', () => {
    // Every pair must match what the pre-existing default did.
    for (const from of JOB_STATUS) {
      for (const to of JOB_STATUS) {
        expect(canTransition(from, to), `${from} → ${to}`).toBe(canTransition(from, to, 'employer'));
      }
    }
  });

  it('treats re-applying the same status as a no-op, not a transition', () => {
    for (const s of JOB_STATUS) {
      expect(isNoopTransition(s, s), s).toBe(true);
      expect(canTransition(s, s, 'admin'), s).toBe(false);
    }
  });

  it('every status is reachable from the moderation queue or terminal by design', () => {
    // Guards against a status existing in the enum but being unreachable by admins.
    const reachable = new Set(JOB_STATUS.flatMap((s) => allowedTransitions(s, 'admin')));
    const unreachable = JOB_STATUS.filter((s) => !reachable.has(s));
    expect(unreachable).toEqual([]);
  });
});
