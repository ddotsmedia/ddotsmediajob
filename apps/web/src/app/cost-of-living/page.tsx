import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { ToolHero } from '@/components/tools/tool-hero';
import { CostOfLiving } from '@/components/tools/cost-of-living';

export const metadata: Metadata = {
  title: 'UAE Cost of Living Calculator — Dubai vs Abu Dhabi vs Sharjah',
  description: 'Calculate your net salary after rent, food and transport across Dubai, Abu Dhabi and Sharjah. Compare the cost of living side by side.',
  alternates: { canonical: `${SITE.url}/cost-of-living` },
};

export default function Page() {
  return (
    <div className="bg-navy-50/30">
      <ToolHero title="UAE Cost of Living Calculator" subtitle="Enter your salary and compare what's left after essentials in Dubai, Abu Dhabi and Sharjah." />
      <div className="mx-auto max-w-5xl px-4 py-8"><CostOfLiving /></div>
    </div>
  );
}
