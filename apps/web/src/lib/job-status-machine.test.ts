import { describe, it, expect } from 'vitest';
import { JOB_STATUS, type JobStatus } from '@ddots/shared';
import {
  canTransition,
  getAvailableTransitions,
  isTerminal,
  isNoopTransition,
  requiresReason,
  isDestructive,
  transitionHint,
  statusLabels,
} from './job-status-machine';

// The client machine must agree with the server exactly: any transition the UI
// offers but the API rejects becomes an error toast the admin cannot act on.
describe('client job-status-machine', () => {
  it('offers only admin-policy transitions', () => {
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('pending', 'active')).toBe(true);
    expect(canTransition('draft', 'filled')).toBe(false);
  });

  it('never offers the current status as an onward move', () => {
    for (const s of JOB_STATUS) {
      expect(getAvailableTransitions(s), s).not.toContain(s);
    }
  });

  it('every offered transition is one canTransition permits', () => {
    for (const from of JOB_STATUS) {
      for (const to of getAvailableTransitions(from)) {
        expect(canTransition(from, to), `${from} → ${to}`).toBe(true);
      }
    }
  });

  it('offers nothing that canTransition would refuse', () => {
    for (const from of JOB_STATUS) {
      const offered = new Set(getAvailableTransitions(from));
      for (const to of JOB_STATUS) {
        if (!offered.has(to)) expect(canTransition(from, to), `${from} → ${to}`).toBe(false);
      }
    }
  });

  it('treats archived as terminal and nothing else', () => {
    expect(isTerminal('archived')).toBe(true);
    for (const s of JOB_STATUS.filter((x) => x !== 'archived')) {
      expect(isTerminal(s), s).toBe(false);
    }
  });

  it('treats re-applying the same status as a no-op', () => {
    for (const s of JOB_STATUS) expect(isNoopTransition(s, s), s).toBe(true);
  });

  it('requires a reason only for rejection', () => {
    expect(requiresReason('rejected')).toBe(true);
    for (const s of JOB_STATUS.filter((x) => x !== 'rejected')) {
      expect(requiresReason(s), s).toBe(false);
    }
  });

  it('flags the irreversible and employer-visible moves', () => {
    expect(isDestructive('archived')).toBe(true);
    expect(isDestructive('rejected')).toBe(true);
    expect(isDestructive('active')).toBe(false);
  });

  it('has a label and a hint for every status it can offer', () => {
    for (const s of JOB_STATUS) {
      expect(statusLabels[s as JobStatus]?.label, s).toBeTruthy();
      expect(transitionHint(s), s).toBeTruthy();
    }
  });

  it('has no "approved" or "live" status — active is both', () => {
    expect(JOB_STATUS).not.toContain('approved' as never);
    expect(JOB_STATUS).not.toContain('live' as never);
    expect(statusLabels.active.label).toBe('Live');
  });
});
