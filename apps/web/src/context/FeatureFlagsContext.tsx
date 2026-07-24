'use client';

import { createContext, useContext } from 'react';
import { trpc } from '@/trpc/react';

type FlagsState = { flags: Record<string, boolean>; loading: boolean; error: boolean };

const FeatureFlagsContext = createContext<FlagsState>({ flags: {}, loading: true, error: false });

/**
 * Loads the viewer's resolved feature-flag map once and shares it app-wide.
 * Server resolves the rollout (by user id), so the client just reads booleans.
 */
export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const q = trpc.featureFlags.forViewer.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const value: FlagsState = { flags: q.data ?? {}, loading: q.isLoading, error: q.isError };
  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

/** `useFeatureFlag('ai_copilot')` → { enabled, loading, error }. */
export function useFeatureFlag(key: string): { enabled: boolean; loading: boolean; error: boolean } {
  const { flags, loading, error } = useContext(FeatureFlagsContext);
  return { enabled: Boolean(flags[key]), loading, error };
}
