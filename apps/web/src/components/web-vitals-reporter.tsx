'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { track } from '@/lib/analytics';

// Core Web Vitals reporter. Uses Next's built-in useReportWebVitals (no extra
// dependency; correct current metric set incl. INP) instead of the deprecated
// web-vitals v2 getCLS/getFID API. Renders nothing — mounted once in the layout.
//
// NOTE: this is a Client Component on purpose. We do NOT turn RootLayout into a
// client component (that would break server metadata) — the layout just renders
// this tiny reporter.
const CORE = new Set(['LCP', 'INP', 'CLS']);

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'production') {
      // CLS is unitless; the rest are milliseconds.
      const v = metric.name === 'CLS' ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`;
      console.log(`[web-vitals] ${metric.name}=${v} (${metric.rating ?? 'n/a'})`);
    }
    // Only forward the three Core Web Vitals to analytics to keep event volume
    // sane. CLS is scaled ×1000 so it survives integer-valued analytics.
    if (CORE.has(metric.name)) {
      track('web-vital', {
        name: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        rating: metric.rating ?? 'unknown',
      });
    }
  });
  return null;
}
