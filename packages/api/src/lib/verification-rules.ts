import type { CompanyVerificationTier } from '@ddots/shared';

/**
 * Deterministic employer verification-tier rules (audit Phase 4A). Pure — no AI, no DB.
 * Tiers, least→most trusted: unverified → pending → basic → enhanced → pro.
 *
 * NOTE: these describe capabilities per tier. They are NOT yet wired to gate job posting —
 * the current product intentionally lets any user post (owner decision). Enforcement, if
 * introduced later, would import canPostJob here so the rule lives in one place.
 */

const ORDER: Record<CompanyVerificationTier, number> = {
  unverified: 0,
  pending: 1,
  basic: 2,
  enhanced: 3,
  pro: 4,
};

/** True if `tier` is at least `min` in the trust order. */
export function tierAtLeast(tier: CompanyVerificationTier, min: CompanyVerificationTier): boolean {
  return ORDER[tier] >= ORDER[min];
}

/** BASIC+ may post jobs. */
export function canPostJob(tier: CompanyVerificationTier): boolean {
  return tierAtLeast(tier, 'basic');
}

/** BASIC+ may view job analytics. */
export function canViewJobStats(tier: CompanyVerificationTier): boolean {
  return tierAtLeast(tier, 'basic');
}

/** PRO only for premium tooling. */
export function canUsePremiumFeatures(tier: CompanyVerificationTier): boolean {
  return tier === 'pro';
}

/** ENHANCED+ may search the CV database. */
export function canSearchCvs(tier: CompanyVerificationTier): boolean {
  return tierAtLeast(tier, 'enhanced');
}

export type TierFeatures = {
  canPost: boolean;
  viewStats: boolean;
  premiumTools: boolean;
  cvSearch: boolean;
};

export function tierFeatures(tier: CompanyVerificationTier): TierFeatures {
  return {
    canPost: canPostJob(tier),
    viewStats: canViewJobStats(tier),
    premiumTools: canUsePremiumFeatures(tier),
    cvSearch: canSearchCvs(tier),
  };
}

/**
 * Deterministic PRO eligibility: enhanced base + 50+ successful hires + 4.5★ rating.
 * (Advisory helper — actual promotion still goes through manual review.)
 */
export function isProEligible(tier: CompanyVerificationTier, successfulHires: number, ratingAvg: number, ratingCount: number): boolean {
  return tierAtLeast(tier, 'enhanced') && successfulHires >= 50 && ratingCount > 0 && ratingAvg >= 4.5;
}
