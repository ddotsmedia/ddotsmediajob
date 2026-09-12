'use client';

import { useState } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

// Dev-only overlay showing live Core Web Vitals. Mounted behind a NODE_ENV check
// in the layout so it never ships to production. Uses the current web-vitals API
// (via next/web-vitals), including INP (which replaced FID).
type Rating = 'good' | 'needs-improvement' | 'poor';
type Entry = { value: number; rating?: Rating };

const RATING_COLOR: Record<string, string> = {
  good: 'text-green-400',
  'needs-improvement': 'text-amber-400',
  poor: 'text-red-400',
};

export function WebVitalsBadge() {
  const [vitals, setVitals] = useState<Record<string, Entry>>({});
  const [open, setOpen] = useState(false);

  useReportWebVitals((metric) => {
    setVitals((v) => ({ ...v, [metric.name]: { value: metric.value, rating: metric.rating as Rating | undefined } }));
  });

  if (Object.keys(vitals).length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-label="Toggle Web Vitals panel"
      className="fixed bottom-4 right-4 z-[200] rounded-lg bg-slate-900/95 px-3 py-2 text-left text-xs text-white shadow-lg hover:bg-slate-800"
    >
      <div className="font-semibold">Web Vitals {open ? '▼' : '▶'}</div>
      {open && (
        <div className="mt-2 space-y-1 font-mono">
          {['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].map((k) => {
            const m = vitals[k];
            if (!m) return null;
            const val = k === 'CLS' ? m.value.toFixed(3) : `${Math.round(m.value)}ms`;
            return (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-slate-400">{k}</span>
                <span className={m.rating ? RATING_COLOR[m.rating] : 'text-white'}>{val}</span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}
