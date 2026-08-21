'use client';

import { useCallback, useRef, useState } from 'react';
import { ADMIN_CHANNEL, type AdminRealtimeEvent } from '@ddots/shared';
import { useRealtimeChannel, isRealtimeEnabled } from '@/lib/realtime';

/** Don't refetch more than once per this window, however many events arrive. */
const COALESCE_MS = 1500;

export type AdminRealtimeState = {
  /** False when Pusher isn't configured — callers keep their normal refetching. */
  enabled: boolean;
  /** Events seen since the last reset, for an unobtrusive "N updates" indicator. */
  pending: number;
  reset: () => void;
};

/**
 * Live admin updates.
 *
 * Uses the Pusher connection this app already ships (see lib/realtime) rather
 * than standing up a second realtime stack. When Pusher is unconfigured the
 * hook is inert and the admin screens fall back to their existing refetching,
 * so nothing breaks in environments without credentials.
 *
 * @param onUpdate invalidate queries here. Called at most once per COALESCE_MS,
 *   because approving 200 jobs would otherwise fire 200 refetches.
 */
export function useAdminRealtime(onUpdate: () => void, event: AdminRealtimeEvent): AdminRealtimeState {
  const [pending, setPending] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback(() => {
    setPending((n) => n + 1);
    if (timer.current) return; // a refetch is already scheduled
    timer.current = setTimeout(() => {
      timer.current = null;
      onUpdate();
    }, COALESCE_MS);
  }, [onUpdate]);

  useRealtimeChannel(isRealtimeEnabled ? ADMIN_CHANNEL : undefined, event, handler);

  return {
    enabled: isRealtimeEnabled,
    pending,
    reset: useCallback(() => setPending(0), []),
  };
}
