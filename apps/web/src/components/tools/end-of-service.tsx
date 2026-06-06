'use client';

import { useState } from 'react';
import { Calculator, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';

type Result = {
  years: number;
  first5Days: number;
  beyond5Days: number;
  totalDays: number;
  dailyWage: number;
  raw: number;
  capped: boolean;
  gratuity: number;
};

function yearsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date(s.getFullYear(), s.getMonth(), s.getDate());
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return 0;
  return (e.getTime() - s.getTime()) / (365.25 * 24 * 3600 * 1000);
}

export function EndOfServiceCalculator() {
  const [basic, setBasic] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [reason, setReason] = useState('resignation');
  const [out, setOut] = useState<Result | null>(null);

  function calc() {
    const b = Number(basic) || 0;
    const years = yearsBetween(joinDate, lastDate);
    if (b <= 0 || years <= 0) { setOut(null); return; }
    const dailyWage = b / 30;
    // Federal Decree-Law 33/2021: <1yr none; 21 days/yr first 5; 30 days/yr beyond; capped at 2 years' pay.
    if (years < 1) {
      setOut({ years, first5Days: 0, beyond5Days: 0, totalDays: 0, dailyWage, raw: 0, capped: false, gratuity: 0 });
      return;
    }
    const first5 = Math.min(years, 5);
    const beyond = Math.max(years - 5, 0);
    const first5Days = first5 * 21;
    const beyond5Days = beyond * 30;
    const totalDays = first5Days + beyond5Days;
    const raw = dailyWage * totalDays;
    const cap = b * 24; // max two years' (basic) pay
    const gratuity = Math.min(raw, cap);
    setOut({ years, first5Days, beyond5Days, totalDays, dailyWage, raw, capped: raw > cap, gratuity });
  }

  const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-AE')}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-white p-6 print:hidden">
        <div className="space-y-1.5">
          <Label>Last basic salary (AED / month) <span className="text-red-500">*</span></Label>
          <Input type="number" inputMode="numeric" value={basic} onChange={(e) => setBasic(e.target.value)} placeholder="e.g. 6000" />
          <p className="text-xs text-navy-700/50">Use basic salary, not gross — gratuity is calculated on basic only.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Join date <span className="text-red-500">*</span></Label><Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Last working day <span className="text-red-500">*</span></Label><Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Reason for leaving</Label>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="resignation">Resignation</option>
            <option value="termination">Termination by employer</option>
            <option value="mutual">Mutual agreement</option>
          </Select>
          <p className="text-xs text-navy-700/50">Under the 2022 law, resignation no longer reduces gratuity — the full amount applies in all cases.</p>
        </div>
        <Button onClick={calc} className="w-full"><Calculator /> Calculate gratuity</Button>
      </div>

      <div className="rounded-xl border bg-white p-6">
        {!out ? (
          <p className="text-sm text-navy-700/50">Enter your basic salary and dates to see your end-of-service gratuity.</p>
        ) : out.gratuity === 0 ? (
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-navy-900">No gratuity due</p>
            <p className="text-navy-700/70">Service under 1 year does not qualify for gratuity under UAE Labour Law ({out.years.toFixed(2)} years entered).</p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-navy-900">End-of-Service Gratuity</h3>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden"><Printer /> Print / PDF</Button>
            </div>
            <Row label="Years of service" value={`${out.years.toFixed(2)} years`} />
            <Row label="Daily wage (basic ÷ 30)" value={aed(out.dailyWage)} />
            <div className="my-2 border-t" />
            <Row label={`First 5 years — ${out.first5Days.toFixed(0)} days`} value={aed(out.dailyWage * out.first5Days)} />
            {out.beyond5Days > 0 && <Row label={`Beyond 5 years — ${out.beyond5Days.toFixed(0)} days`} value={aed(out.dailyWage * out.beyond5Days)} />}
            <Row label={`Total — ${out.totalDays.toFixed(0)} days`} value={aed(out.raw)} />
            {out.capped && <p className="text-xs text-accent-600">Capped at two years&apos; basic salary (legal maximum).</p>}
            <div className="my-2 border-t" />
            <Row label="Gratuity payable" value={aed(out.gratuity)} strong />
            <p className="pt-2 text-xs text-navy-700/50">
              Per Federal Decree-Law No. 33 of 2021: 21 days&apos; basic pay per year for the first 5 years, 30 days&apos; per year after, capped at 2 years&apos; pay. For guidance only — your final settlement may vary with unpaid leave, deductions or contract terms.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-navy-700/70">{label}</span>
      <span className={strong ? 'font-display text-lg font-bold text-teal-700' : 'font-semibold text-navy-900'}>{value}</span>
    </div>
  );
}
