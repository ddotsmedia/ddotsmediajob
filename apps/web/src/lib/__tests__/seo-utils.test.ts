import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { truncateTitle, overflowsWithBrand, TITLE_MAX, BRAND_SUFFIX_LENGTH } from '@/lib/seo-utils';
import { generateDescription } from '@/lib/seo-descriptions';

describe('truncateTitle', () => {
  it('leaves short titles alone', () => {
    expect(truncateTitle('Dubai jobs')).toBe('Dubai jobs');
  });

  it('cuts at a word boundary and fits the budget', () => {
    const out = truncateTitle('Senior Marketing Manager for a Luxury Hospitality Group in Downtown Dubai');
    expect(out.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/); // no space before the ellipsis
  });

  it('returns the original rather than a stub when one word exceeds the budget', () => {
    const word = 'a'.repeat(80);
    expect(truncateTitle(word)).toBe(word);
  });
});

describe('generateDescription', () => {
  it('omits the company when there is none', () => {
    const d = generateDescription({ type: 'job', title: 'Driver', emirate: 'Dubai', company: null });
    expect(d).not.toContain('null');
    expect(d).not.toContain('undefined');
    expect(d).toBe('Driver in Dubai. Apply free on DdotsMediaJobs.');
  });

  it('never exceeds the description budget', () => {
    const d = generateDescription({
      type: 'job',
      title: 'Senior Registered Nurse — Intensive Care Unit, Night Shift Rotation',
      company: 'A Very Long Private Healthcare Group Holding Company LLC',
      emirate: 'Abu Dhabi',
      salary: 'AED 18,000 - 22,000',
    });
    expect(d.length).toBeLessThanOrEqual(155);
  });

  it('uses a singular noun for one job', () => {
    expect(generateDescription({ type: 'emirate', name: 'Ajman', jobCount: 1 })).toContain('1 job hiring');
  });
});

/**
 * Regression guard for the title-length fix. Walks the app router and fails if a
 * hardcoded page title would render over 60 characters — the 31 fixed here would
 * otherwise creep back one page at a time.
 */
describe('page titles fit in search results', () => {
  // Relative to this file, not cwd — vitest runs from the monorepo root.
  const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app');

  function pageFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) return pageFiles(p);
      return entry === 'page.tsx' || entry === 'layout.tsx' ? [p] : [];
    });
  }

  it('has no static title over 60 chars once the brand suffix is added', () => {
    const offenders: string[] = [];
    const re = /(?<![A-Za-z])title:\s*(\{\s*absolute:\s*)?(['"])(.+?)\2/gs;

    for (const file of pageFiles(APP)) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(re)) {
        const absolute = Boolean(m[1]);
        const raw = m[3] ?? '';
        if (raw.includes('${')) continue; // runtime value, not checkable here
        // openGraph/twitter titles get no template and are allowed to be longer.
        const before = src.slice(0, m.index);
        const inSocial = ['openGraph', 'twitter'].some((kw) => {
          const i = before.lastIndexOf(kw);
          if (i === -1) return false;
          const seg = before.slice(i);
          return (seg.match(/\{/g)?.length ?? 0) > (seg.match(/\}/g)?.length ?? 0);
        });
        if (inSocial) continue;

        const rendered = absolute ? raw.length : raw.length + BRAND_SUFFIX_LENGTH;
        if (rendered > TITLE_MAX) {
          offenders.push(`${rendered} chars — ${file.replace(APP, '')} — "${raw}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('overflowsWithBrand', () => {
  it('accounts for the appended brand', () => {
    expect(overflowsWithBrand('a'.repeat(43))).toBe(true);
    expect(overflowsWithBrand('a'.repeat(42))).toBe(false);
  });
});
