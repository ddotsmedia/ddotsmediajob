import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { ToolHero } from '@/components/tools/tool-hero';
import { GoldenVisaChecker } from '@/components/tools/golden-visa-checker';

export const metadata: Metadata = {
  title: 'UAE Golden Visa Checker 2026 — Check Your Eligibility Free',
  description: 'Check if you qualify for a UAE Golden Visa (10-year) or the new Blue Visa. Free instant eligibility checker based on salary, degree and role.',
  alternates: { canonical: `${SITE.url}/golden-visa-checker` },
};

export default function Page() {
  return (
    <div className="bg-navy-50/30">
      <ToolHero title="Golden & Blue Visa Eligibility Checker" subtitle="Find out in seconds whether you qualify for a UAE Golden Visa (10-year), the new Blue Visa, or a standard employment visa." />
      <div className="mx-auto max-w-5xl px-4 py-8"><GoldenVisaChecker /></div>
    </div>
  );
}
