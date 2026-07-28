import { describe, it, expect } from 'vitest';
import { validateFileType, validateFileSize, sanitizeSvg } from './file-validator';

describe('validateFileType (Phase 8A)', () => {
  it('accepts an allowed PDF', () => {
    const r = validateFileType({ name: 'cv.pdf', type: 'application/pdf', size: 1000 });
    expect(r.valid).toBe(true);
    expect(r.type).toBe('pdf');
  });

  it('rejects an .exe', () => {
    const r = validateFileType({ name: 'malware.exe', type: 'application/octet-stream', size: 1000 });
    expect(r.valid).toBe(false);
    expect(r.type).toBeNull();
    expect(r.error).toMatch(/not allowed/i);
  });

  it('rejects extension/MIME mismatch (svg body wearing a .png name)', () => {
    const r = validateFileType({ name: 'logo.png', type: 'image/svg+xml', size: 1000 });
    expect(r.valid).toBe(false);
  });

  it('normalizes jpeg → jpg and is case-insensitive', () => {
    expect(validateFileType({ name: 'PHOTO.JPEG', size: 10 }).type).toBe('jpg');
  });
});

describe('validateFileSize (Phase 8A)', () => {
  it('rejects an oversized PDF (>5MB default)', () => {
    const r = validateFileSize({ name: 'big.pdf', size: 6 * 1024 * 1024 });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/max 5MB/i);
  });

  it('rejects an empty file', () => {
    expect(validateFileSize({ name: 'x.pdf', size: 0 }).valid).toBe(false);
  });

  it('accepts a file at the limit', () => {
    expect(validateFileSize({ name: 'ok.pdf', size: 5 * 1024 * 1024 }).valid).toBe(true);
  });
});

describe('sanitizeSvg (Phase 8A)', () => {
  it('strips <script> blocks', () => {
    const out = sanitizeSvg('<svg><script>alert(1)</script><rect/></svg>');
    expect(out).not.toMatch(/script/i);
    expect(out).toContain('<rect/>');
  });

  it('strips inline event handlers', () => {
    const out = sanitizeSvg('<svg onload="steal()"><circle onclick=\'x()\'/></svg>');
    expect(out).not.toMatch(/onload|onclick/i);
  });

  it('neutralizes javascript: hrefs and foreignObject', () => {
    const out = sanitizeSvg('<svg><a href="javascript:alert(1)">x</a><foreignObject><body/></foreignObject></svg>');
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/foreignObject/i);
  });

  it('drops DOCTYPE/ENTITY (billion-laughs / XXE)', () => {
    const out = sanitizeSvg('<!DOCTYPE svg [<!ENTITY x "y">]><svg/>');
    expect(out).not.toMatch(/DOCTYPE|ENTITY/i);
    expect(out).toContain('<svg/>');
  });

  it('strips the slash-separated handler form <svg/onload=…>', () => {
    const out = sanitizeSvg('<svg/onload="alert(1)"><rect/onmouseover=x()/></svg>');
    expect(out).not.toMatch(/onload|onmouseover/i);
  });

  it('re-scans reformed nested tags to a fixpoint (<<script>script>)', () => {
    const out = sanitizeSvg('<<script>script>alert(1)<</script>/script>');
    expect(out).not.toMatch(/<script/i);
  });

  it('neutralizes entity-obfuscated javascript: URIs', () => {
    const out = sanitizeSvg('<svg><a href="jav&#x09;ascript:alert(1)">x</a></svg>');
    expect(out).not.toMatch(/alert\(1\)/);
  });
});
