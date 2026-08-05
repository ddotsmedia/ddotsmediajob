'use client';

import { useEffect, useState } from 'react';
import { getCLS, getLCP, getINP } from 'web-vitals';

export function WebVitalsBadge() {
  const [vitals, setVitals] = useState<any>({});

  useEffect(() => {
    getCLS(({ value }) => setVitals(v => ({ ...v, CLS: value })));
    getLCP(({ value }) => setVitals(v => ({ ...v, LCP: value })));
    getINP(({ value }) => setVitals(v => ({ ...v, INP: value })));
  }, []);

  if (!Object.keys(vitals).length) return null;

  return (
    <div className="fixed bottom-4 right-4 p-3 bg-slate-900 text-white text-xs rounded-lg z-50">
      <div>Web Vitals</div>
      {vitals.CLS && <div>CLS: {vitals.CLS.toFixed(3)}</div>}
      {vitals.LCP && <div>LCP: {vitals.LCP.toFixed(0)}ms</div>}
      {vitals.INP && <div>INP: {vitals.INP.toFixed(0)}ms</div>}
    </div>
  );
}
