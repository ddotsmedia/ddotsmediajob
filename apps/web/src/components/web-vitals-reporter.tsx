'use client';

import { useEffect } from 'react';
import { getCLS, getLCP, getINP } from 'web-vitals';

export function WebVitalsReporter() {
  useEffect(() => {
    getCLS(metric => console.log('[Web Vitals] CLS:', metric.value));
    getLCP(metric => console.log('[Web Vitals] LCP:', metric.value));
    getINP(metric => console.log('[Web Vitals] INP:', metric.value));
  }, []);

  return null;
}
