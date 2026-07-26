import { describe, it, expect } from 'vitest';
import { mostRecentCtaType } from './cta-linking';

describe('mostRecentCtaType (Phase 7A linking)', () => {
  it('returns null with no clicks', () => {
    expect(mostRecentCtaType([])).toBeNull();
  });
  it('picks the most recent click regardless of array order', () => {
    const clicks = [
      { ctaType: 'email', clickedAt: '2026-01-01T10:00:00Z' },
      { ctaType: 'whatsapp', clickedAt: '2026-01-03T10:00:00Z' }, // newest
      { ctaType: 'external_link', clickedAt: '2026-01-02T10:00:00Z' },
    ];
    expect(mostRecentCtaType(clicks)).toBe('whatsapp');
  });
  it('single click links to that type', () => {
    expect(mostRecentCtaType([{ ctaType: 'apply_button', clickedAt: new Date() }])).toBe('apply_button');
  });
});
