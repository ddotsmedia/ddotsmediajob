import * as Sentry from '@sentry/nextjs';

// Server/edge Sentry init — only when a DSN is configured.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
    ignoreErrors: ['NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
    beforeSend(event, hint) {
      // Drop 404s and aborted/cancelled requests — they are noise, not bugs.
      const err = hint?.originalException as { message?: string; digest?: string } | undefined;
      const msg = `${err?.message ?? ''} ${err?.digest ?? ''} ${event.message ?? ''}`;
      if (/abort|cancel|ECONNRESET|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK;404/i.test(msg)) return null;
      return event;
    },
  });
}
