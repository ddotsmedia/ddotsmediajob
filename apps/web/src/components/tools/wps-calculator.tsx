'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

export function WpsCalculator() {
  const [gross, setGross] = useState('');
  const [years, setYears] = useState('');
  const [out, setOut] = useState<{ basic: number; housing: number; transport: number; gratuity: number } | null>(null);

  function calc() {
    const g = Number(gross) || 0;
    const y = Number(years) || 0;
    // Typical UAE split: basic 60%, housing 25%, transport 15%.
    const basic = Math.round(g * 0.6);
    const housing = Math.round(g * 0.25);
    const transport = g - basic - housing;
    // Gratuity: 21 days/yr for first 5 years, 30 days/yr after, on basic.
    const dailyBasic = basic / 30;
    const gratuity =
      y <= 5 ? Math.round(dailyBasic * 21 * y) : Math.round(dailyBasic * 21 * 5 + dailyBasic * 30 * (y - 5));
    setOut({ basic, housing, transport, gratuity });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <div className="space-y-1.5"><Label>Gross monthly salary (AED)</Label><Input type="number" value={gross} onChange={(e) => setGross(e.target.value)} placeholder="e.g. 10000" /></div>
        <div className="space-y-1.5"><Label>Years of service (for gratuity)</Label><Input type="number" value={years} onChange={(e) => setYears(e.target.value)} placeholder="e.g. 3" /></div>
        <Button onClick={calc} className="w-full"><Calculator /> Calculate</Button>
      </div>
      <div className="rounded-xl border bg-white p-6">
        {!out ? <p className="text-sm text-navy-700/50">Your WPS breakdown will appear here.</p> : (
          <div className="space-y-2 text-sm">
            <Row label="Basic salary (60%)" value={out.basic} />
            <Row label="Housing allowance (25%)" value={out.housing} />
            <Row label="Transport allowance (15%)" value={out.transport} />
            <div className="my-2 border-t" />
            <Row label="End-of-service gratuity" value={out.gratuity} strong />
            <p className="pt-2 text-xs text-navy-700/50">Allowance split is the common UAE convention; your contract may differ. Gratuity uses 21 days/yr (first 5 yrs) then 30 days/yr, on basic pay.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-700/70">{label}</span>
      <span className={strong ? 'font-display text-lg font-bold text-teal-700' : 'font-semibold text-navy-900'}>AED {value.toLocaleString('en-AE')}</span>
    </div>
  );
}
