import { db, ctaClicks, ctaConversions, eq, and } from '@ddots/db';
import { mostRecentCtaType } from './cta-linking';

/** Store an external-CTA click (WhatsApp/email/external/apply tap). Never throws. */
export async function recordClick(userId: string | null, jobId: string, ctaType: string, sourcePage?: string | null): Promise<void> {
  try {
    await db.insert(ctaClicks).values({ userId, jobId, ctaType, sourcePage: sourcePage ?? null });
  } catch (e) {
    console.error('[cta] recordClick failed:', e instanceof Error ? e.message : e);
  }
}

/**
 * Store a conversion and link it to the user's most recent click on the same job (from_cta_type).
 * A conversion is a real funnel event — distinct from a raw click. Never throws.
 */
export async function recordConversion(userId: string | null, jobId: string, conversionType: string): Promise<void> {
  try {
    let fromCtaType: string | null = null;
    if (userId) {
      const clicks = await db
        .select({ ctaType: ctaClicks.ctaType, clickedAt: ctaClicks.clickedAt })
        .from(ctaClicks)
        .where(and(eq(ctaClicks.userId, userId), eq(ctaClicks.jobId, jobId)));
      fromCtaType = mostRecentCtaType(clicks);
    }
    await db.insert(ctaConversions).values({ userId, jobId, conversionType, fromCtaType });
  } catch (e) {
    console.error('[cta] recordConversion failed:', e instanceof Error ? e.message : e);
  }
}
