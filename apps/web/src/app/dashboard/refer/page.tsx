'use client';

import { toast } from 'sonner';
import { Megaphone, Plus, Loader2 } from 'lucide-react';
import { CATEGORIES, EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Badge } from '@/components/ui/primitives';

const RELATIONS = [
  { value: 'work_there', label: 'I work there' },
  { value: 'friend_referred', label: 'A friend referred it' },
  { value: 'other', label: 'Other' },
] as const;

const STATUS_VARIANT: Record<string, 'success' | 'muted' | 'urgent' | 'outline'> = {
  active: 'success',
  pending: 'outline',
  rejected: 'urgent',
  expired: 'muted',
};

export default function ReferPage() {
  const utils = trpc.useUtils();
  const posts = trpc.jobs.myCommunity.useQuery();
  const create = trpc.jobs.createCommunity.useMutation({
    onSuccess: () => {
      utils.jobs.myCommunity.invalidate();
      toast.success('Referral submitted for review');
    },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const min = Number(f.get('salaryMin')) || null;
    const max = Number(f.get('salaryMax')) || null;
    create.mutate(
      {
        title: String(f.get('title')),
        categorySlug: String(f.get('category')) as never,
        emirateSlug: String(f.get('emirate')) as never,
        description: String(f.get('description')),
        salaryMin: min,
        salaryMax: max,
        contactWhatsapp: String(f.get('whatsapp')) || undefined,
        contactEmail: String(f.get('email')) || undefined,
        relation: String(f.get('relation')) as never,
        isAnonymous: f.get('anonymous') === 'on',
      },
      { onSuccess: () => form.reset() },
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Refer a Job</h1>
      <p className="text-navy-700/60">
        Know a vacancy? Share it with the community. Posts are reviewed before going live. Limit 2 per month; each listing runs for 15 days.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Job title</Label>
          <Input name="title" required minLength={3} maxLength={160} placeholder="e.g. Light Driver — Al Quoz" />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select name="category" defaultValue={CATEGORIES[0]?.slug} required>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Emirate</Label>
          <Select name="emirate" defaultValue={EMIRATES[0]?.slug} required>
            {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Salary min (AED, optional)</Label>
          <Input name="salaryMin" type="number" min={0} placeholder="e.g. 3000" />
        </div>
        <div className="space-y-1.5">
          <Label>Salary max (AED, optional)</Label>
          <Input name="salaryMax" type="number" min={0} placeholder="e.g. 4500" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <textarea
            name="description"
            required
            minLength={30}
            maxLength={8000}
            rows={5}
            className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="What's the role, who to contact, requirements…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Contact WhatsApp</Label>
          <Input name="whatsapp" placeholder="+9715xxxxxxxx" maxLength={30} />
        </div>
        <div className="space-y-1.5">
          <Label>Contact email</Label>
          <Input name="email" type="email" placeholder="hr@company.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Your relation to this job</Label>
          <Select name="relation" defaultValue="work_there" required>
            {RELATIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-navy-700">
          <input type="checkbox" name="anonymous" className="h-4 w-4 rounded text-teal-600" /> Post anonymously
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Submit referral
          </Button>
        </div>
      </form>

      <h2 className="mt-10 font-display text-lg font-bold text-navy-900">My referrals</h2>
      <div className="mt-4 space-y-3">
        {posts.isLoading && <p className="text-navy-700/60">Loading…</p>}
        {posts.data?.length === 0 && (
          <p className="rounded-xl border bg-white p-8 text-center text-navy-700/60">No referrals yet. Share one above.</p>
        )}
        {posts.data?.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <Megaphone className="text-amber-500" />
              <div>
                <p className="font-semibold text-navy-900">{p.title}</p>
                <p className="text-sm text-navy-700/60">
                  {[p.categorySlug, p.emirateSlug].filter(Boolean).join(' · ')}
                  {p.rejectionReason ? ` · ${p.rejectionReason}` : ''}
                </p>
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[p.status] ?? 'muted'} className="capitalize">{p.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
