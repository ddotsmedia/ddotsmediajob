'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

export function NafisCalculator() {
  const [size, setSize] = useState('');
  const [nationals, setNationals] = useState('');
  const [out, setOut] = useState<{ quota: number; shortfall: number; subsidy: number } | null>(null);

  function calc() {
    const s = Number(size) || 0;
    const n = Number(nationals) || 0;
    // Mainland firms with 50+ skilled staff: ~2% Emiratisation/yr target.
    const quota = s >= 50 ? Math.ceil(s * 0.02) : 0;
    const shortfall = Math.max(0, quota - n);
    // Nafis salary support: ~AED 5,000–7,000/month per Emirati hire (indicative).
    const subsidy = n * 6000;
    setOut({ quota, shortfall, subsidy });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <div className="space-y-1.5"><Label>Total skilled employees</Label><Input type="number" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 120" /></div>
        <div className="space-y-1.5"><Label>Current Emirati employees</Label><Input type="number" value={nationals} onChange={(e) => setNationals(e.target.value)} placeholder="e.g. 1" /></div>
        <Button onClick={calc} className="w-full"><Calculator /> Calculate</Button>
      </div>
      <div className="rounded-xl border bg-white p-6">
        {!out ? <p className="text-sm text-navy-700/50">Your Emiratisation status will appear here.</p> : (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-navy-700/70">Annual Emirati target</span><span className="font-bold text-navy-900">{out.quota} hires</span></div>
            <div className="flex justify-between"><span className="text-navy-700/70">Shortfall</span><span className={`font-bold ${out.shortfall > 0 ? 'text-accent-600' : 'text-lime-600'}`}>{out.shortfall} {out.shortfall > 0 ? 'to hire' : '— compliant'}</span></div>
            <div className="flex justify-between"><span className="text-navy-700/70">Est. Nafis salary support</span><span className="font-display text-lg font-bold text-teal-700">AED {out.subsidy.toLocaleString('en-AE')}/mo</span></div>
            <p className="pt-2 text-xs text-navy-700/50">Indicative. Mainland firms with 50+ skilled staff face ~2%/yr Emiratisation targets; Nafis supports salaries ~AED 5K–7K per Emirati. Minimum Emirati salary AED 6,000 from Jan 2026. Confirm with MOHRE/Nafis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
