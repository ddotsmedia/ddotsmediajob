'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileCheck2, Loader2, Sparkles } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';

const STEPS = [
  { t: 'Job offer & MOHRE contract', d: 'Issue offer letter, then the MOHRE-attested employment contract for the candidate to sign.' },
  { t: 'Work permit application', d: 'Apply for the work permit and entry permit through MOHRE / immigration.' },
  { t: 'Entry / status change', d: 'Candidate enters on the permit, or adjusts status if already in the UAE.' },
  { t: 'Medical & Emirates ID', d: 'Medical fitness test and biometrics for the Emirates ID.' },
  { t: 'Residence visa', d: 'Residence visa stamped / issued electronically.' },
  { t: 'Labour card', d: 'Labour card issued — candidate is now a legal employee.' },
];

export default function MohrePage() {
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [nationality, setNationality] = useState('');
  const [companySize, setCompanySize] = useState('11-50');
  const check = trpc.ai.checkPermitEligibility.useMutation({ onError: (e) => toast.error(e.message) });

  return (
    <div>
      <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">MOHRE Permits</h1></div>
      <p className="text-navy-700/60">Check work-permit eligibility and track the process.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-white p-5">
          <h2 className="font-display font-bold text-navy-900">Eligibility checker</h2>
          <div className="space-y-1.5"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Civil Engineer" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Monthly salary (AED)</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Nationality (optional)</Label><Input value={nationality} onChange={(e) => setNationality(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Company size</Label>
            <Select value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
              {['1-10', '11-50', '51-200', '201-500', '500-1000', '1000-plus'].map((s) => <option key={s} value={s}>{s} employees</option>)}
            </Select>
          </div>
          <Button onClick={() => check.mutate({ role, salary: Number(salary) || 0, nationality: nationality || undefined, companySize })} disabled={check.isPending || role.trim().length < 2 || !salary}>
            {check.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Check eligibility
          </Button>
          {check.data && <div className="prose prose-slate mt-2 max-w-none whitespace-pre-wrap rounded-lg border bg-navy-50/40 p-4 text-sm prose-headings:font-display">{check.data.content}</div>}
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-display font-bold text-navy-900">Permit process</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{i + 1}</span>
                <div><p className="font-semibold text-navy-900">{s.t}</p><p className="text-sm text-navy-700/70">{s.d}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-navy-700/50">General guidance — confirm requirements on the official MOHRE portal.</p>
        </div>
      </div>
    </div>
  );
}
