'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';

const LEVELS = ['junior', 'mid', 'senior', 'lead', 'executive'] as const;

/** Anonymous salary submission form (Phase 6B CTA). */
export function SalarySubmitForm({ defaultTitle = '', defaultEmirate = '' }: { defaultTitle?: string; defaultEmirate?: string }) {
  const [jobTitle, setJobTitle] = useState(defaultTitle);
  const [emirate, setEmirate] = useState(defaultEmirate);
  const [monthly, setMonthly] = useState('');
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('mid');
  const [done, setDone] = useState(false);
  const submit = trpc.salary.submitSalary.useMutation({
    onSuccess: (r) => { toast.success(r.message); setDone(true); },
    onError: (e) => toast.error(e.message),
  });

  if (done) return <p className="rounded-xl bg-teal-50 p-4 text-center text-sm font-medium text-teal-800">Thank you — your anonymous salary is recorded.</p>;

  return (
    <div className="rounded-2xl border bg-white p-5">
      <h3 className="font-display font-bold text-navy-900">Share your salary anonymously</h3>
      <p className="mt-1 text-sm text-navy-700/60">Help others negotiate fairly. We never show your identity.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Job title</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer" /></div>
        <div className="space-y-1.5"><Label>Monthly salary (AED)</Label><Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="e.g. 12000" /></div>
        <div className="space-y-1.5"><Label>Emirate</Label><Select value={emirate} onChange={(e) => setEmirate(e.target.value)}><option value="">Select</option>{EMIRATES.map((em) => <option key={em.slug} value={em.name}>{em.name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>Experience level</Label><Select value={level} onChange={(e) => setLevel(e.target.value as (typeof LEVELS)[number])}>{LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}</Select></div>
      </div>
      <Button
        className="mt-4 w-full sm:w-auto"
        disabled={submit.isPending || jobTitle.trim().length < 2 || !(Number(monthly) >= 1000)}
        onClick={() => submit.mutate({ jobTitle: jobTitle.trim(), emirate: emirate || undefined, monthlyAed: Number(monthly), experienceLevel: level })}
      >
        {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit anonymously
      </Button>
    </div>
  );
}
