// Next.js instrumentation hook. Loads Sentry server config (no-op unless
// NEXT_PUBLIC_SENTRY_DSN is set — the config self-guards).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate env at startup — warn (never crash) so the app still boots.
    const required = ['DATABASE_URL', 'AUTH_SECRET', 'NEXTAUTH_URL'];
    const missingRequired = required.filter((k) => !process.env[k]);
    if (missingRequired.length) console.error('[env] MISSING REQUIRED:', missingRequired.join(', '));
    if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) console.warn('[env] AUTH_SECRET should be ≥32 chars');
    const optional = ['ANTHROPIC_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY', 'REDIS_URL', 'RESEND_API_KEY', 'R2_ACCOUNT_ID', 'WHAPI_TOKEN'];
    const missingOptional = optional.filter((k) => !process.env[k]);
    if (missingOptional.length) console.warn('[env] optional not set (feature disabled):', missingOptional.join(', '));
  }
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
