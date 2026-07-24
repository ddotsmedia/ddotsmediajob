import { describe, it, expect } from 'vitest';
import { estimateCost, systemPrompt } from './copilot-prompts';

describe('copilot cost + prompts (Phase 1A)', () => {
  it('estimateCost = (in*3 + out*15)/1e6', () => {
    expect(estimateCost(1_000_000, 0)).toBeCloseTo(3, 6);
    expect(estimateCost(0, 1_000_000)).toBeCloseTo(15, 6);
    expect(estimateCost(1000, 500)).toBeCloseTo((1000 * 3 + 500 * 15) / 1_000_000, 9);
    expect(estimateCost(0, 0)).toBe(0);
  });

  it('systemPrompt varies by context and always includes the injection guard', () => {
    expect(systemPrompt('jobseeker')).toContain('jobseekers');
    expect(systemPrompt('employer')).toContain('employers');
    expect(systemPrompt('admin')).toContain('operations');
    for (const ctx of ['jobseeker', 'employer', 'admin', 'weird']) {
      expect(systemPrompt(ctx)).toContain('untrusted data');
    }
  });

  it('unknown context falls back to jobseeker', () => {
    expect(systemPrompt('nonsense')).toBe(systemPrompt('jobseeker'));
  });
});
