'use client';

import { useState } from 'react';
import { Flag, Calculator } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Input, Label } from '@/components/ui/primitives';

export default function EmiratizationPage() {
  const [headcount, setHeadcount] = useState(50);
  const [emiratis, setEmiratis] = useState(0);
  const [target, setTarget] = useState(2);
  const stats = trpc.employerAts.emiratizationStats.useQuery({ headcount, emiratis, targetPct: target });

  const [salary, setSalary] = useState(8000);
  const [years, setYears] = useState(3);
  const grat = trpc.employerAts.gratuity.useQuery({ monthlySalary: salary, years });

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="flex items-center gap-2"><Flag className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Emiratization compliance</h1></div>
        <p className="text-navy-700/60">Estimate your current Emiratization rate, gap to target and Nafis subsidy potential.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 rounded-xl border bg-white p-5">
          <div className="space-y-1.5"><Label>Total headcount</Label><Input type="number" value={headcount} onChange={(e) => setHeadcount(Number(e.target.value) || 0)} /></div>
          <div className="space-y-1.5"><Label>Emirati employees</Label><Input type="number" value={emiratis} onChange={(e) => setEmiratis(Number(e.target.value) || 0)} /></div>
          <div className="space-y-1.5"><Label>Target %</Label><Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value) || 0)} /></div>
        </div>
        {stats.data && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Stat label="Current Emiratization" value={`${stats.data.currentPct}%`} />
            <Stat label="MOHRE target" value={`${stats.data.targetPct}%`} />
            <Stat label="Emiratis still needed" value={String(stats.data.gap)} accent={stats.data.gap > 0} />
            <Stat label="Potential Nafis subsidy / yr" value={`AED ${stats.data.potentialSubsidy.toLocaleString('en-AE')}`} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-teal-500" /><h2 className="font-display text-xl font-bold text-navy-900">Gratuity calculator</h2></div>
        <p className="text-navy-700/60">UAE end-of-service: 21 days/yr for first 5 years, 30 days/yr after.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 rounded-xl border bg-white p-5">
          <div className="space-y-1.5"><Label>Monthly salary (AED)</Label><Input type="number" value={salary} onChange={(e) => setSalary(Number(e.target.value) || 0)} /></div>
          <div className="space-y-1.5"><Label>Years of service</Label><Input type="number" value={years} onChange={(e) => setYears(Number(e.target.value) || 0)} /></div>
        </div>
        {grat.data && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Total gratuity" value={`AED ${grat.data.total.toLocaleString('en-AE')}`} />
            <Stat label="Monthly accrual" value={`AED ${grat.data.monthlyAccrual.toLocaleString('en-AE')}`} />
            <Stat label="True monthly cost" value={`AED ${grat.data.trueMonthlyCost.toLocaleString('en-AE')}`} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-orange-200 bg-orange-50' : 'bg-white'}`}>
      <p className="text-xs text-navy-700/60">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-navy-900">{value}</p>
    </div>
  );
}
