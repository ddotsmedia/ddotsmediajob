'use client';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/primitives';

const SIZES = ['1-10', '11-50', '51-200', '201-500', '500-1000', '1000-plus'] as const;

export default function EmployerProfilePage() {
  const profile = trpc.employers.me.useQuery();
  const upsert = trpc.employers.upsertProfile.useMutation({
    onSuccess: () => toast.success('Company profile saved'),
    onError: (e) => toast.error(e.message),
  });

  if (profile.isLoading) return <Loader2 className="animate-spin text-teal-500" />;
  const p = profile.data;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    upsert.mutate({
      companyName: String(f.get('companyName')),
      website: String(f.get('website')) || undefined,
      about: String(f.get('about')) || undefined,
      industry: String(f.get('industry')) || undefined,
      emirateSlug: (String(f.get('emirate')) || undefined) as never,
      size: (String(f.get('size')) || undefined) as never,
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">Company Profile</h1>
      <p className="text-navy-700/60">This information appears on your jobs and company page.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-xl border bg-white p-6">
        <div className="space-y-1.5">
          <Label>Company name</Label>
          <Input name="companyName" required defaultValue={p?.companyName ?? ''} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Input name="industry" defaultValue={p?.industry ?? ''} placeholder="e.g. IT & Software" />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input name="website" type="url" defaultValue={p?.website ?? ''} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label>Emirate</Label>
            <Select name="emirate" defaultValue={p?.emirateSlug ?? ''}>
              <option value="">Select</option>
              {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Company size</Label>
            <Select name="size" defaultValue={p?.size ?? ''}>
              <option value="">Select</option>
              {SIZES.map((s) => <option key={s} value={s}>{s.replace('-plus', '+')} employees</option>)}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>About</Label>
          <Textarea name="about" defaultValue={p?.about ?? ''} placeholder="Tell candidates about your company…" />
        </div>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </form>
    </div>
  );
}
