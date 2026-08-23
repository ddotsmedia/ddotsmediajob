import { describe, it, expect } from 'vitest';
import { normalizeEmirateValue, toEmirateSlug, isEmirateSlug } from './emirate-normalize';
import { EMIRATE_SLUGS } from './constants';
import { jobFieldsSchema, communityPostSchema } from './validators';

describe('normalizeEmirateValue', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmirateValue('  DUBAI ')).toBe('dubai');
  });

  it('collapses spaces and underscores to dashes', () => {
    expect(normalizeEmirateValue('Abu  Dhabi')).toBe('abu-dhabi');
    expect(normalizeEmirateValue('umm_al_quwain')).toBe('umm-al-quwain');
  });

  it('collapses repeated dashes and trims stray ones', () => {
    expect(normalizeEmirateValue('-ras--al-khaimah-')).toBe('ras-al-khaimah');
  });

  it('leaves an already-canonical slug untouched', () => {
    for (const s of EMIRATE_SLUGS) expect(normalizeEmirateValue(s), s).toBe(s);
  });
});

describe('toEmirateSlug', () => {
  it('resolves the reported case: DUBAI -> dubai', () => {
    expect(toEmirateSlug('DUBAI')).toBe('dubai');
  });

  it('resolves display names', () => {
    expect(toEmirateSlug('Abu Dhabi')).toBe('abu-dhabi');
    expect(toEmirateSlug('Ras Al Khaimah')).toBe('ras-al-khaimah');
  });

  it('resolves common abbreviations', () => {
    expect(toEmirateSlug('RAK')).toBe('ras-al-khaimah');
    expect(toEmirateSlug('uaq')).toBe('umm-al-quwain');
    expect(toEmirateSlug('DXB')).toBe('dubai');
  });

  it('round-trips every canonical slug', () => {
    for (const s of EMIRATE_SLUGS) expect(toEmirateSlug(s.toUpperCase()), s).toBe(s);
  });

  it('returns null for values that are not emirates', () => {
    expect(toEmirateSlug('Atlantis')).toBeNull();
    expect(toEmirateSlug('')).toBeNull();
    expect(toEmirateSlug(null)).toBeNull();
    expect(toEmirateSlug(undefined)).toBeNull();
  });

  it('does not silently resolve an unknown emirate to Dubai', () => {
    // whatsapp/createJob used to default anything unrecognised — including
    // "SHARJAH" — to dubai. The resolver must report failure instead.
    expect(toEmirateSlug('SHARJAH')).toBe('sharjah');
    expect(toEmirateSlug('Narnia')).toBeNull();
  });

  it('isEmirateSlug agrees with toEmirateSlug', () => {
    expect(isEmirateSlug('DUBAI')).toBe(true);
    expect(isEmirateSlug('Narnia')).toBe(false);
  });
});

// The actual crash site: a bare z.enum over the lowercase slugs.
describe('job validators accept real-world emirate casing', () => {
  const base = {
    title: 'Chef',
    description: 'x'.repeat(40),
    categorySlug: 'hospitality',
    jobType: 'full-time',
  };

  it('accepts DUBAI where a bare enum would throw "Invalid enum value"', () => {
    const r = jobFieldsSchema.safeParse({ ...base, emirateSlug: 'DUBAI' });
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
    if (r.success) expect(r.data.emirateSlug).toBe('dubai');
  });

  it('accepts "Abu Dhabi" and normalises it', () => {
    const r = jobFieldsSchema.safeParse({ ...base, emirateSlug: 'Abu Dhabi' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.emirateSlug).toBe('abu-dhabi');
  });

  it('still rejects a value that is not an emirate', () => {
    expect(jobFieldsSchema.safeParse({ ...base, emirateSlug: 'Atlantis' }).success).toBe(false);
  });

  it('applies to community posts too', () => {
    const r = communityPostSchema.safeParse({
      title: 'Driver',
      categorySlug: 'driving',
      emirateSlug: 'SHARJAH',
      description: 'y'.repeat(40),
      relation: 'work_there',
    });
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
    if (r.success) expect(r.data.emirateSlug).toBe('sharjah');
  });
});
