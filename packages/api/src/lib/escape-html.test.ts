import { describe, it, expect } from 'vitest';
import { escapeHtml } from './security';

// Bulk employer email interpolates admin-authored text into an HTML body.
describe('escapeHtml', () => {
  it('neutralises a script tag', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes ampersands first, so entities are not double-broken', () => {
    expect(escapeHtml('Tom & Jerry <b>')).toBe('Tom &amp; Jerry &lt;b&gt;');
  });

  it('escapes quotes that could break out of an attribute', () => {
    expect(escapeHtml(`" onload="x`)).toBe('&quot; onload=&quot;x');
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('leaves ordinary copy untouched', () => {
    const plain = 'Your job listing expires in 3 days. Please renew it.';
    expect(escapeHtml(plain)).toBe(plain);
  });

  it('is idempotent enough that re-escaping never yields raw markup', () => {
    expect(escapeHtml(escapeHtml('<img src=x onerror=alert(1)>'))).not.toContain('<img');
  });
});
