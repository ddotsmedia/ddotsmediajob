import { describe, it, expect } from 'vitest';
import { diffFields, snapshot, clientIp, clientUserAgent } from './audit-diff';

describe('diffFields', () => {
  it('records only the fields that actually changed', () => {
    const d = diffFields({ status: 'pending', title: 'Chef' }, { status: 'active', title: 'Chef' });
    expect(d).toEqual({ status: { from: 'pending', to: 'active' } });
  });

  it('returns nothing for a no-op update, so the log does not imply a change', () => {
    expect(diffFields({ status: 'active' }, { status: 'active' })).toEqual({});
  });

  it('compares dates by value, not identity', () => {
    const a = new Date('2024-01-01T00:00:00Z');
    const b = new Date('2024-01-01T00:00:00Z');
    expect(diffFields({ publishedAt: a }, { publishedAt: b })).toEqual({});
  });

  it('reports a real date change as ISO strings', () => {
    const d = diffFields(
      { publishedAt: new Date('2024-01-01T00:00:00Z') },
      { publishedAt: new Date('2024-06-01T00:00:00Z') },
    );
    expect(d.publishedAt).toEqual({ from: '2024-01-01T00:00:00.000Z', to: '2024-06-01T00:00:00.000Z' });
  });

  it('compares objects structurally rather than by reference', () => {
    expect(diffFields({ meta: { a: 1 } }, { meta: { a: 1 } })).toEqual({});
    expect(diffFields({ meta: { a: 1 } }, { meta: { a: 2 } }).meta).toBeDefined();
  });

  it('ignores updatedAt, which changes on every write', () => {
    const d = diffFields(
      { updatedAt: new Date('2024-01-01Z'), status: 'a' },
      { updatedAt: new Date('2024-02-01Z'), status: 'a' },
    );
    expect(d).toEqual({});
  });

  it('never leaks a secret value, only that it changed', () => {
    const d = diffFields({ passwordHash: 'old-hash' }, { passwordHash: 'new-hash' });
    expect(d.passwordHash).toEqual({ from: '[redacted]', to: '[redacted]' });
    expect(JSON.stringify(d)).not.toContain('old-hash');
  });

  it('redacts every sensitive field name variant', () => {
    for (const key of ['totpSecret', 'backupCodes', 'resetToken', 'apiKey', 'refreshToken']) {
      const d = diffFields({ [key]: 'a' }, { [key]: 'b' });
      expect(JSON.stringify(d), key).not.toContain('"a"');
    }
  });

  it('truncates a huge value instead of bloating the row', () => {
    const d = diffFields({ description: 'x' }, { description: 'y'.repeat(2000) });
    expect(String(d.description!.to)).toContain('… (2000 chars)');
    expect(String(d.description!.to).length).toBeLessThan(600);
  });

  it('ignores keys absent from the before snapshot', () => {
    // A partial `before` must not report every unselected column as "added".
    expect(diffFields({ status: 'a' }, { status: 'a', title: 'New' })).toEqual({});
  });

  it('returns empty when either side is missing', () => {
    expect(diffFields(null, { a: 1 })).toEqual({});
    expect(diffFields({ a: 1 }, null)).toEqual({});
  });

  it('caps the number of recorded fields', () => {
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (let i = 0; i < 60; i++) {
      before[`f${i}`] = i;
      after[`f${i}`] = i + 1;
    }
    const d = diffFields(before, after);
    expect(Object.keys(d).length).toBeLessThanOrEqual(41); // 40 fields + the "…" marker
    expect(d['…']).toBeDefined();
  });
});

describe('snapshot', () => {
  it('captures a whole row for deletes', () => {
    expect(snapshot({ title: 'Chef', status: 'active' })).toEqual({ title: 'Chef', status: 'active' });
  });

  it('redacts secrets in the snapshot too', () => {
    expect(snapshot({ email: 'a@b.com', passwordHash: 'secret' })).toEqual({
      email: 'a@b.com',
      passwordHash: '[redacted]',
    });
  });

  it('returns null for a missing row', () => {
    expect(snapshot(null)).toBeNull();
  });
});

describe('clientIp', () => {
  it('takes the first hop of x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1, 10.0.0.2' });
    expect(clientIp(h)).toBe('203.0.113.9');
  });

  it('falls back to x-real-ip behind Nginx', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
  });

  it('is null when no headers are available', () => {
    expect(clientIp(undefined)).toBeNull();
    expect(clientIp(new Headers())).toBeNull();
  });
});

describe('clientUserAgent', () => {
  it('reads the user-agent header', () => {
    expect(clientUserAgent(new Headers({ 'user-agent': 'Mozilla/5.0' }))).toBe('Mozilla/5.0');
  });

  it('truncates an over-long user agent to fit the column', () => {
    const ua = clientUserAgent(new Headers({ 'user-agent': 'A'.repeat(900) }));
    expect(ua).toHaveLength(512);
  });
});
