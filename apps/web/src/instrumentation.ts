// Next.js instrumentation hook. Loads Sentry server config (no-op unless
// NEXT_PUBLIC_SENTRY_DSN is set — the config self-guards).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.server.config');
  }
}

// Forward nested React Server Component render errors to Sentry (Next 15).
export async function onRequestError(
  ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
}
