import { describe, it, expect } from 'vitest';
import { chunk } from './useBulkSelection';

// The server caps one bulk call at 500 ids. chunk() is what lets a selection of
// any size run as a handful of batched requests instead of failing validation.
const SERVER_CAP = 500;

describe('chunk', () => {
  it('leaves a selection under the cap as a single batch', () => {
    const ids = Array.from({ length: 120 }, (_, i) => `id-${i}`);
    const batches = chunk(ids, SERVER_CAP);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(120);
  });

  it('splits a selection larger than the cap', () => {
    const ids = Array.from({ length: 1200 }, (_, i) => `id-${i}`);
    const batches = chunk(ids, SERVER_CAP);
    expect(batches.map((b) => b.length)).toEqual([500, 500, 200]);
  });

  it('never emits a batch over the cap', () => {
    for (const n of [1, 499, 500, 501, 999, 1000, 5000]) {
      const batches = chunk(Array.from({ length: n }, (_, i) => i), SERVER_CAP);
      expect(batches.every((b) => b.length <= SERVER_CAP), `n=${n}`).toBe(true);
    }
  });

  it('preserves every id exactly once, in order', () => {
    const ids = Array.from({ length: 1201 }, (_, i) => `id-${i}`);
    expect(chunk(ids, SERVER_CAP).flat()).toEqual(ids);
  });

  it('returns no batches for an empty selection, so nothing is sent', () => {
    expect(chunk([], SERVER_CAP)).toEqual([]);
  });

  it('handles an exact multiple without a trailing empty batch', () => {
    const batches = chunk(Array.from({ length: 1000 }, (_, i) => i), SERVER_CAP);
    expect(batches).toHaveLength(2);
    expect(batches.every((b) => b.length === 500)).toBe(true);
  });

  it('rejects a zero size rather than looping forever', () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow();
  });
});
