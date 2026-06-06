import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { ToolHero } from '@/components/tools/tool-hero';
import { WpsTools } from '@/components/tools/wps-tools';

export const metadata: Metadata = {
  title: 'UAE WPS Salary & Gratuity Calculator',
  description: 'Break down your UAE salary into basic, housing and transport allowances, and calculate your end-of-service gratuity. Free WPS calculator.',
  alternates: { canonical: `${SITE.url}/wps-calculator` },
};

export default function Page() {
  return (
    <div className="bg-navy-50/30">
      <ToolHero title="WPS Salary & Gratuity Calculator" subtitle="See your salary split into basic, housing and transport allowances, and estimate your end-of-service gratuity." />
      <div className="mx-auto max-w-5xl px-4 py-8"><WpsTools /></div>
    </div>
  );
}
