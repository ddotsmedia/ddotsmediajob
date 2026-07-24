import { ShieldCheck, Clock, ShieldQuestion, Crown } from 'lucide-react';
import type { CompanyVerificationTier } from '@ddots/shared';

const TIERS: Record<CompanyVerificationTier, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  unverified: { label: 'Unverified', cls: 'bg-navy-100 text-navy-600', Icon: ShieldQuestion },
  pending: { label: 'Verification Pending', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
  basic: { label: 'Basic Verified', cls: 'bg-blue-100 text-blue-700', Icon: ShieldCheck },
  enhanced: { label: 'Enhanced Verified', cls: 'bg-green-100 text-green-700', Icon: ShieldCheck },
  pro: { label: 'Pro Verified', cls: 'bg-yellow-100 text-yellow-800', Icon: Crown },
};

/** Color-coded employer verification tier badge (Phase 4B). */
export function VerificationStatusBadge({ tier, className = '' }: { tier: CompanyVerificationTier; className?: string }) {
  const t = TIERS[tier] ?? TIERS.unverified;
  const { Icon } = t;
  return (
    <span
      title="Your profile is visible to jobseekers"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${t.cls} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" /> {t.label}
    </span>
  );
}
