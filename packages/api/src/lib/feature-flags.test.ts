import { describe, it, expect } from 'vitest';
import { rolloutBucket, flagEnabledFor } from './feature-flags';

describe('feature-flags rollout logic', () => {
  it('disabled flag is always off', () => {
    expect(flagEnabledFor({ enabled: false, rolloutPercent: 100 }, 'k', 'u1')).toBe(false);
  });

  it('100% rollout is on for everyone (incl. anonymous)', () => {
    expect(flagEnabledFor({ enabled: true, rolloutPercent: 100 }, 'k', 'u1')).toBe(true);
    expect(flagEnabledFor({ enabled: true, rolloutPercent: 100 }, 'k', null)).toBe(true);
  });

  it('0% rollout is off even when enabled', () => {
    expect(flagEnabledFor({ enabled: true, rolloutPercent: 0 }, 'k', 'u1')).toBe(false);
  });

  it('anonymous users are excluded from partial rollout', () => {
    expect(flagEnabledFor({ enabled: true, rolloutPercent: 50 }, 'k', null)).toBe(false);
  });

  it('rolloutBucket is deterministic and stable per (key,user)', () => {
    expect(rolloutBucket('ai_copilot', 'u1')).toBe(rolloutBucket('ai_copilot', 'u1'));
    expect(rolloutBucket('ai_copilot', 'u1')).toBeGreaterThanOrEqual(0);
    expect(rolloutBucket('ai_copilot', 'u1')).toBeLessThan(100);
  });

  it('partial rollout decision matches the user bucket', () => {
    const key = 'salary_intelligence';
    for (const user of ['a', 'b', 'c', 'd', 'e', 'user-123', 'xyz']) {
      const bucket = rolloutBucket(key, user);
      expect(flagEnabledFor({ enabled: true, rolloutPercent: 50 }, key, user)).toBe(bucket < 50);
    }
  });

  it('a 50% rollout includes roughly half of many users', () => {
    let on = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) if (flagEnabledFor({ enabled: true, rolloutPercent: 50 }, 'k', `user-${i}`)) on++;
    expect(on / N).toBeGreaterThan(0.4);
    expect(on / N).toBeLessThan(0.6);
  });
});
