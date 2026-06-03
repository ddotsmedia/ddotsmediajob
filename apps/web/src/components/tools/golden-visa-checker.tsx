'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { VISA_THRESHOLDS } from '@ddots/shared';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';

type Result = { tier: 'golden' | 'blue' | 'standard'; title: string; reasons: string[]; color: string };

export function GoldenVisaChecker() {
  const [salary, setSalary] = useState('');
  const [degree, setDegree] = useState('yes');
  const [skilled, setSkilled] = useState('no');
  const [result, setResult] = useState<Result | null>(null);

  function check() {
    const s = Number(salary) || 0;
    if (s >= VISA_THRESHOLDS.goldenSalary && degree === 'yes') {
      setResult({
        tier: 'golden',
        title: 'Likely eligible for a 10-year Golden Visa 🏆',
        color: 'text-gold-600',
        reasons: [
          `Monthly salary of AED ${s.toLocaleString('en-AE')} meets the AED ${VISA_THRESHOLDS.goldenSalary.toLocaleString('en-AE')}+ threshold`,
          'Holds a bachelor degree or higher',
          'Apply via ICP / GDRFA with an attested degree and salary certificate',
        ],
      });
    } else if (s >= VISA_THRESHOLDS.blueSalary && skilled === 'yes') {
      setResult({
        tier: 'blue',
        title: 'May qualify for the new Blue Visa 🔵',
        color: 'text-teal-600',
        reasons: [
          'Skilled-trade / specialist profession',
          `Salary meets the ~AED ${VISA_THRESHOLDS.blueSalary.toLocaleString('en-AE')} range`,
          'Blue Visa targets skilled tradespeople and specialists (UAE 2025/26)',
        ],
      });
    } else {
      setResult({
        tier: 'standard',
        title: 'Standard employment visa',
        color: 'text-navy-700',
        reasons: [
          `For Golden Visa you typically need AED ${VISA_THRESHOLDS.goldenSalary.toLocaleString('en-AE')}+/month and a degree`,
          'Increase salary or pursue an in-demand specialised role to qualify later',
          'A standard 2-year employment visa is sponsored by your employer',
        ],
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <div className="space-y-1.5">
          <Label>Monthly salary (AED)</Label>
          <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 32000" />
        </div>
        <div className="space-y-1.5">
          <Label>Bachelor degree or higher?</Label>
          <Select value={degree} onChange={(e) => setDegree(e.target.value)}><option value="yes">Yes</option><option value="no">No</option></Select>
        </div>
        <div className="space-y-1.5">
          <Label>Skilled trade / specialist role?</Label>
          <Select value={skilled} onChange={(e) => setSkilled(e.target.value)}><option value="no">No</option><option value="yes">Yes</option></Select>
        </div>
        <Button onClick={check} className="w-full"><ShieldCheck /> Check eligibility</Button>
      </div>

      <div className="rounded-xl border bg-white p-6">
        {!result ? (
          <p className="text-sm text-navy-700/50">Your eligibility result will appear here.</p>
        ) : (
          <div>
            <h3 className={`font-display text-xl font-bold ${result.color}`}>{result.title}</h3>
            <ul className="mt-4 space-y-2">
              {result.reasons.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-navy-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" /> {r}
                </li>
              ))}
            </ul>
            <Button asChild variant="accent" className="mt-6 w-full">
              <Link href={result.tier === 'golden' ? '/jobs?salaryMin=30000' : '/jobs'}>Browse eligible jobs</Link>
            </Button>
            <p className="mt-3 text-xs text-navy-700/50">Indicative only — confirm with ICP/GDRFA. Rules updated for 2026.</p>
          </div>
        )}
      </div>
    </div>
  );
}
