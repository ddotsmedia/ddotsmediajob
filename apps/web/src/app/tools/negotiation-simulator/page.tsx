import type { Metadata } from 'next';
import { Handshake } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { NegotiationSim } from './negotiation-sim';

export const metadata: Metadata = {
  title: 'Salary Negotiation Simulator — UAE | DdotsMediaJobs',
  description: 'Practice negotiating your UAE salary against an AI hiring manager. Get realistic pushback and instant coaching to land a better offer in AED.',
  alternates: { canonical: `${SITE.url}/tools/negotiation-simulator` },
};

export default function NegotiationSimulatorPage() {
  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-2 text-teal-300"><Handshake className="h-5 w-5" /><span className="text-sm font-medium">Negotiation Simulator</span></div>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">Practice your salary negotiation</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Roleplay against an AI UAE hiring manager. Make your ask, handle the pushback, and get coached after every reply.</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <NegotiationSim />
        <article className="mt-10 max-w-2xl space-y-3 text-sm leading-relaxed text-navy-700/80">
          <h2 className="font-display text-lg font-bold text-navy-900">Negotiating salary in the UAE</h2>
          <p>Strong candidates research the market, quantify their value, and negotiate the full package — basic pay, allowances, visa, insurance and flights — not just the headline figure. UAE salaries carry no personal income tax, so the monthly number is effectively take-home pay.</p>
          <p>Use the simulator to rehearse your pitch and responses before the real conversation, then benchmark your target with our salary guide.</p>
        </article>
      </div>
    </div>
  );
}
