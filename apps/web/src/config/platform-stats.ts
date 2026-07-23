/**
 * Single source of truth for marketing statistics (audit Phase 13).
 * Update these numbers HERE only — never hardcode them in components. Homepage and sidebar
 * previously disagreed (120,000 vs 80,000 members); both now read from here.
 */
export const PLATFORM_STATS = {
  whatsappGroups: 76,
  /** Total memberships across all groups — includes people who are in more than one group. */
  totalMemberships: 120_000,
  updatedAt: '2026-07',
} as const;

/** "76" — plain count for inline copy. */
export const groupCount = PLATFORM_STATS.whatsappGroups;
/** "120,000+ members" — the one canonical members label. */
export const membersLabel = `${PLATFORM_STATS.totalMemberships.toLocaleString('en-US')}+ members`;
