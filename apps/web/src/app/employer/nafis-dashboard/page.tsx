'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Landmark, Loader2, Users, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-AE')}`;

export default function NafisDashboardPage() {
  const [totalSkilled, setTotalSkilled] = useState('50');
  const [currentEmiratis, setCurrentEmiratis] = useState('0');
  const [targetRate, setTargetRate] = useState('2');
  const [subsidyPer, setSubsidyPer] = useState('5000');
  const plan = trpc.ai.emiratizationAssistant.useMutation({ onError: (e) => toast.error(e.message) });

  const total = Number(totalSkilled) || 0;
  const current = Number(currentEmiratis) || 0;
  const rate = Number(targetRate) || 0;
  const subsidy = Number(subsidyPer) || 0;

  const required = Math.ceil((total * rate) / 100);
  const gap = Math.max(0, required - current);
  const monthlySubsidy = current * subsidy;          // Nafis top-up you can claim now
  const potentialSubsidy = required * subsidy;        // at target
  const monthlyPenalty = gap * (96000 / 12);          // MOHRE non-compliance fine ≈ AED 96k/yr per gap

  return (
    <div>
      <div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Nafis &amp; Emiratization</h1></div>
      <p className="text-navy-700/60">Track your Emirati quota and estimate Nafis salary support.</p>

      <div className="mt-6 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-4">
        <div className="space-y-1.5"><Label>Skilled employees</Label><Input type="number" value={totalSkilled} onChange={(e) => setTotalSkilled(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Current Emiratis</Label><Input type="number" value={currentEmiratis} onChange={(e) => setCurrentEmiratis(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Target rate (%)</Label><Input type="number" value={targetRate} onChange={(e) => setTargetRate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Nafis top-up / hire (AED/mo)</Label><Input type="number" value={subsidyPer} onChange={(e) => setSubsidyPer(e.target.value)} /></div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Required Emiratis" value={String(required)} tone="navy" />
        <Stat icon={TrendingUp} label="Gap to target" value={String(gap)} tone={gap > 0 ? 'orange' : 'green'} />
        <Stat icon={Landmark} label="Nafis support now" value={aed(monthlySubsidy)} sub="/month" tone="teal" />
        <Stat icon={AlertTriangle} label="Est. non-compliance fine" value={aed(monthlyPenalty)} sub="/month" tone={gap > 0 ? 'red' : 'green'} />
      </div>

      <div className="mt-4 rounded-xl border bg-navy-50/50 p-4 text-sm text-navy-700/80">
        <p>At target you could claim up to <strong>{aed(potentialSubsidy)}/month</strong> in Nafis salary support across {required} Emirati roles. Figures are indicative — confirm current rates on the official Nafis portal.</p>
      </div>

      <div className="mt-6">
        <Button onClick={() => plan.mutate({ companySize: total, currentNationals: current })} disabled={plan.isPending}>
          {plan.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate AI compliance plan
        </Button>
        {plan.data && <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap rounded-xl border bg-white p-6 prose-headings:font-display">{plan.data.content}</div>}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; tone: 'navy' | 'teal' | 'orange' | 'green' | 'red' }) {
  const colors: Record<string, string> = { navy: 'text-navy-900', teal: 'text-teal-700', orange: 'text-orange-600', green: 'text-green-600', red: 'text-red-600' };
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-navy-700/60"><Icon className="h-4 w-4" /> {label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${colors[tone]}`}>{value}<span className="text-sm font-normal text-navy-700/50">{sub}</span></div>
    </div>
  );
}
