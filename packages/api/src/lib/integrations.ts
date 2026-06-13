/**
 * Central feature-flag checks for OPTIONAL third-party integrations.
 * Every integration must degrade gracefully when unconfigured — these helpers
 * are the single source of truth used by libs, routers and the admin UI.
 */

/** Resend is configured only when a real key (re_…) is present. */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.startsWith('re_');
}

/** Cloudflare R2 is configured when the account id is real (not "placeholder") and keys exist. */
export function isR2Configured(): boolean {
  const id = process.env.R2_ACCOUNT_ID;
  return (
    !!id &&
    id !== 'placeholder' &&
    !!process.env.R2_ACCESS_KEY_ID &&
    !!process.env.R2_SECRET_ACCESS_KEY
  );
}

/** Meilisearch is configured when a URL is set (key optional for local dev). */
export function isSearchConfigured(): boolean {
  return !!process.env.MEILISEARCH_URL;
}

/** Pusher real-time is configured when the server triad is present. */
export function isRealtimeConfigured(): boolean {
  return !!(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET);
}

/** Umami analytics is configured when the public website id is set. */
export function isAnalyticsConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_UMAMI_ID;
}

export type IntegrationStatus = {
  email: boolean;
  storage: boolean;
  search: boolean;
  realtime: boolean;
  analytics: boolean;
};

export function integrationStatus(): IntegrationStatus {
  return {
    email: isEmailConfigured(),
    storage: isR2Configured(),
    search: isSearchConfigured(),
    realtime: isRealtimeConfigured(),
    analytics: isAnalyticsConfigured(),
  };
}
