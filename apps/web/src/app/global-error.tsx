'use client';

import { useEffect } from 'react';

/**
 * Global error boundary — catches errors thrown in the root layout itself
 * (e.g. a client widget that fails on an older mobile browser). Without this,
 * such a throw white-screens the whole app. It replaces the root layout, so it
 * must render its own <html>/<body>.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error]', error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import('@sentry/nextjs').then((Sentry) => Sentry.captureException(error)).catch(() => {});
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: '#f8fafc', color: '#0f172a' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: '8px', maxWidth: '28rem', color: '#475569' }}>The page failed to load. Please try again.</p>
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button onClick={reset} style={{ background: '#2a9aa4', color: '#fff', border: 0, borderRadius: '8px', padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Try again</button>
            {/* Hard reload is intentional here — the React tree is broken. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, textDecoration: 'none' }}>Go home</a>
          </div>
        </div>
      </body>
    </html>
  );
}
