'use client';

import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, Trash2, Plus, Loader2 } from 'lucide-react';
import { CATEGORIES, EMIRATES, ALERT_FREQUENCY } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Badge } from '@/components/ui/primitives';

export default function AlertsPage() {
  const params = useSearchParams();
  // Prefill from a job page link (?category=&emirate=&channel=).
  const pCategory = params.get('category') ?? '';
  const pEmirate = params.get('emirate') ?? '';
  const pChannel = params.get('channel') === 'whatsapp' ? 'whatsapp' : 'email';
  const utils = trpc.useUtils();
  const alerts = trpc.alerts.list.useQuery();
  const create = trpc.alerts.create.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      toast.success('Alert created');
    },
    onError: (e) => toast.error(e.message),
  });
  const toggle = trpc.alerts.toggle.useMutation({ onSuccess: () => utils.alerts.list.invalidate() });
  const del = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      toast.success('Alert deleted');
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const channel = (String(f.get('channel')) || 'email') as 'email' | 'whatsapp';
    create.mutate({
      keywords: String(f.get('keywords')) || undefined,
      categorySlug: String(f.get('category')) || undefined,
      emirateSlug: String(f.get('emirate')) || undefined,
      frequency: String(f.get('frequency')) as never,
      channel,
      whatsappNumber: channel === 'whatsapp' ? String(f.get('whatsappNumber')) || undefined : undefined,
    });
    e.currentTarget.reset();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Job Alerts</h1>
      <p className="text-navy-700/60">Get matching jobs delivered by email or WhatsApp.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Deliver via</Label>
          <Select name="channel" defaultValue={pChannel}>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp number</Label>
          <Input name="whatsappNumber" placeholder="+9715xxxxxxxx (if WhatsApp)" />
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label>Keywords</Label>
          <Input name="keywords" placeholder="e.g. accountant" />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select name="category" defaultValue={pCategory}>
            <option value="">Any</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Emirate</Label>
          <Select name="emirate" defaultValue={pEmirate}>
            <option value="">Any</option>
            {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Frequency</Label>
          <div className="flex gap-2">
            <Select name="frequency" defaultValue="daily">
              {ALERT_FREQUENCY.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
            </Select>
            <Button type="submit" size="icon" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {alerts.data?.length === 0 && (
          <p className="rounded-xl border bg-white p-8 text-center text-navy-700/60">No alerts yet. Create one above.</p>
        )}
        {alerts.data?.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <Bell className={a.isActive ? 'text-teal-500' : 'text-navy-300'} />
              <div>
                <p className="font-semibold text-navy-900">{a.keywords || 'All jobs'}</p>
                <p className="text-sm text-navy-700/60">
                  {[a.categorySlug, a.emirateSlug].filter(Boolean).join(' · ') || 'Any category & emirate'} · {a.frequency}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={a.isActive ? 'success' : 'muted'}>{a.isActive ? 'Active' : 'Paused'}</Badge>
              <Button variant="ghost" size="sm" onClick={() => toggle.mutate({ id: a.id })}>
                {a.isActive ? 'Pause' : 'Resume'}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: a.id })}>
                <Trash2 className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
