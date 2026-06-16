'use client';

import { useEffect } from 'react';

/** Increments a job's view count once per browser session (sessionStorage dedup). */
export function JobViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* private mode — still track once */
    }
    const body = JSON.stringify({ action: 'view' });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(`/api/jobs/${slug}/track`, new Blob([body], { type: 'application/json' }));
      else void fetch(`/api/jobs/${slug}/track`, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
    } catch {
      /* non-blocking */
    }
  }, [slug]);
  return null;
}
