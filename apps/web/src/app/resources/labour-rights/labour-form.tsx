'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Scale, Loader2 } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input, Label, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

const ISSUES = ['Unpaid salary / WPS', 'Wrongful termination', 'End-of-service gratuity', 'Visa / labour ban', 'Working hours / overtime', 'Annual leave', 'Contract dispute', 'Workplace safety', 'Other'];

export function LabourForm() {
  const [issueType, setIssueType] = useState(ISSUES[0]!);
  const [emirate, setEmirate] = useState('');
  const m = trpc.ai.labourComplaintGuidePublic.useMutation({ onError: (e) => toast.error(e.message) });

  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 sm:items-end">
        <div className="space-y-1.5"><Label>Issue type</Label><Select value={issueType} onChange={(e) => setIssueType(e.target.value)}>{ISSUES.map((i) => <option key={i} value={i}>{i}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>Emirate</Label><Select value={emirate} onChange={(e) => setEmirate(e.target.value)}><option value="">Any</option>{EMIRATES.map((e) => <option key={e.slug} value={e.name}>{e.name}</option>)}</Select></div>
      </div>
      <Button className="mt-3" onClick={() => m.mutate({ issueType, emirate: emirate || undefined })} disabled={m.isPending}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <Scale />} Get my action plan
      </Button>
      {m.data && <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap rounded-xl border bg-white p-6 prose-headings:font-display">{m.data.content}</div>}
    </div>
  );
}
