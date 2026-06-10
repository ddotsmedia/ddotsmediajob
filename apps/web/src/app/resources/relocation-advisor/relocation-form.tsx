'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plane, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Input, Label } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export function RelocationForm() {
  const [country, setCountry] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [familySize, setFamilySize] = useState('1');
  const m = trpc.ai.relocationAdvisorPublic.useMutation({ onError: (e) => toast.error(e.message) });

  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-4 sm:items-end">
        <div className="space-y-1.5"><Label>From country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India" /></div>
        <div className="space-y-1.5"><Label>Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Nurse" /></div>
        <div className="space-y-1.5"><Label>Salary (AED/mo)</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="optional" /></div>
        <div className="space-y-1.5"><Label>Family size</Label><Input type="number" value={familySize} onChange={(e) => setFamilySize(e.target.value)} /></div>
      </div>
      <Button className="mt-3" onClick={() => m.mutate({ country, role, salary: salary ? Number(salary) : undefined, familySize: Number(familySize) || 1 })} disabled={m.isPending || country.trim().length < 2 || role.trim().length < 2}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <Plane />} Get my relocation plan
      </Button>
      {m.data && <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap rounded-xl border bg-white p-6 prose-headings:font-display">{m.data.content}</div>}
    </div>
  );
}
