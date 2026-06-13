'use client';

import { useEffect } from 'react';

const KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'ap2';

/** True when Pusher is configured for the client. When false, callers keep polling. */
export const isRealtimeEnabled = !!KEY;

/**
 * Subscribe to a user's real-time channel and run `onEvent` when `event` fires.
 * No-op when Pusher isn't configured (pusher-js is lazy-loaded only then), so
 * the bundle never hard-depends on the connection. Pass a STABLE onEvent
 * (useCallback) to avoid resubscribing each render.
 */
export function useRealtime(userId: string | undefined, event: string, onEvent: () => void): void {
  useEffect(() => {
    if (!userId || !KEY) return;
    let cancelled = false;
    let pusher: { disconnect: () => void } | null = null;
    void (async () => {
      try {
        const mod = await import('pusher-js');
        if (cancelled) return;
        const Pusher = mod.default;
        const p = new Pusher(KEY, { cluster: CLUSTER });
        p.subscribe(`user-${userId}`).bind(event, onEvent);
        pusher = p;
      } catch (err) {
        console.error('[realtime] subscribe failed:', err);
      }
    })();
    return () => {
      cancelled = true;
      pusher?.disconnect();
    };
  }, [userId, event, onEvent]);
}
