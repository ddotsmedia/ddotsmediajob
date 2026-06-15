import * as Sentry from '@sentry/nextjs';

// Browser Sentry init — only when a public DSN is configured.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
    ignoreErrors: [
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
      'AbortError',
      'The user aborted a request',
      'Load failed',
      'ResizeObserver loop',
    ],
  });
}
