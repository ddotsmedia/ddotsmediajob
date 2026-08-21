import { describe, it, expect } from 'vitest';
import { NAV } from './admin-nav';

describe('admin NAV', () => {
  it('every destination is an /admin route', () => {
    for (const n of NAV) {
      expect(n.href, n.label).toMatch(/^\/admin(\/|$)/);
    }
  });

  it('has no duplicate destinations', () => {
    const hrefs = NAV.map((n) => n.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('has no duplicate labels — the palette would show indistinguishable rows', () => {
    const labels = NAV.map((n) => n.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('every entry has a label and an icon', () => {
    for (const n of NAV) {
      expect(n.label.trim(), n.href).not.toBe('');
      expect(n.icon, n.href).toBeTruthy();
    }
  });

  it('does not offer /admin/employers, which is not a route in this app', () => {
    expect(NAV.map((n) => n.href)).not.toContain('/admin/employers');
  });

  it('covers the pages the palette is expected to reach', () => {
    const hrefs = NAV.map((n) => n.href);
    for (const href of ['/admin/jobs', '/admin/users', '/admin/audit', '/admin/settings', '/admin/blog']) {
      expect(hrefs, href).toContain(href);
    }
  });
});
