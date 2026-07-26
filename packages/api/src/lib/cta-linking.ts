/** Pure CTA→conversion linking logic (Phase 7A). No DB import → unit-testable. */

/** The cta_type of the most recent click, or null if there were none. */
export function mostRecentCtaType(clicks: { ctaType: string; clickedAt: Date | string }[]): string | null {
  if (!clicks.length) return null;
  let best = clicks[0]!;
  for (const c of clicks) {
    if (new Date(c.clickedAt).getTime() > new Date(best.clickedAt).getTime()) best = c;
  }
  return best.ctaType;
}

export const CTA_TYPES = ['whatsapp', 'email', 'external_link', 'apply_button'] as const;
export const CONVERSION_TYPES = ['application_started', 'application_completed', 'interview_scheduled'] as const;
export const SOURCE_PAGES = ['job_detail', 'search', 'email', 'push', 'mobile_apply_bar'] as const;
