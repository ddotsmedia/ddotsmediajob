import { describe, it, expect } from 'vitest';
import { COMPANY_VERIFICATION_TIERS } from '@ddots/shared';
import { tierAtLeast, canPostJob, canViewJobStats, canUsePremiumFeatures, canSearchCvs, tierFeatures, isProEligible } from './verification-rules';

describe('verification tiers (audit Phase 4A)', () => {
  it('enum values are the 5 expected tiers, ordered', () => {
    expect(COMPANY_VERIFICATION_TIERS).toEqual(['unverified', 'pending', 'basic', 'enhanced', 'pro']);
  });

  it('tierAtLeast respects trust order', () => {
    expect(tierAtLeast('pro', 'basic')).toBe(true);
    expect(tierAtLeast('basic', 'basic')).toBe(true);
    expect(tierAtLeast('pending', 'basic')).toBe(false);
    expect(tierAtLeast('unverified', 'basic')).toBe(false);
  });

  it('canPostJob: BASIC+ only', () => {
    expect(canPostJob('unverified')).toBe(false);
    expect(canPostJob('pending')).toBe(false);
    expect(canPostJob('basic')).toBe(true);
    expect(canPostJob('enhanced')).toBe(true);
    expect(canPostJob('pro')).toBe(true);
  });

  it('canViewJobStats: BASIC+', () => {
    expect(canViewJobStats('pending')).toBe(false);
    expect(canViewJobStats('basic')).toBe(true);
  });

  it('canSearchCvs: ENHANCED+', () => {
    expect(canSearchCvs('basic')).toBe(false);
    expect(canSearchCvs('enhanced')).toBe(true);
    expect(canSearchCvs('pro')).toBe(true);
  });

  it('canUsePremiumFeatures: PRO only', () => {
    expect(canUsePremiumFeatures('enhanced')).toBe(false);
    expect(canUsePremiumFeatures('pro')).toBe(true);
  });

  it('tierFeatures matrix for each tier', () => {
    expect(tierFeatures('unverified')).toEqual({ canPost: false, viewStats: false, premiumTools: false, cvSearch: false });
    expect(tierFeatures('basic')).toEqual({ canPost: true, viewStats: true, premiumTools: false, cvSearch: false });
    expect(tierFeatures('enhanced')).toEqual({ canPost: true, viewStats: true, premiumTools: false, cvSearch: true });
    expect(tierFeatures('pro')).toEqual({ canPost: true, viewStats: true, premiumTools: true, cvSearch: true });
  });

  it('isProEligible: enhanced + 50 hires + 4.5 stars', () => {
    expect(isProEligible('enhanced', 50, 4.6, 20)).toBe(true);
    expect(isProEligible('enhanced', 49, 4.6, 20)).toBe(false); // too few hires
    expect(isProEligible('enhanced', 50, 4.4, 20)).toBe(false); // rating too low
    expect(isProEligible('basic', 100, 5, 50)).toBe(false); // not enhanced
    expect(isProEligible('enhanced', 50, 4.5, 0)).toBe(false); // no ratings
  });
});
