'use client';

/**
 * Umami custom-event tracking. No-op when Umami isn't loaded (script only loads
 * if NEXT_PUBLIC_UMAMI_ID is set), so calls are always safe.
 */
type EventData = Record<string, string | number | boolean>;

export function track(event: string, data?: EventData): void {
  if (typeof window === 'undefined') return;
  try {
    const umami = (window as unknown as { umami?: { track: (e: string, d?: EventData) => void } }).umami;
    umami?.track(event, data);
  } catch {
    /* analytics must never break the app */
  }
}
