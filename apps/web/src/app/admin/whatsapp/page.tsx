'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { CATEGORIES, EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Badge } from '@/components/ui/primitives';

export default function AdminWhatsappPage() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const groups = trpc.admin.waGroups.useQuery();
  const inval = () => utils.admin.waGroups.invalidate();
  const upsert = trpc.admin.waUpsert.useMutation({ onSuccess: () => { inval(); setOpen(false); toast.success('Saved'); }, onError: (e) => toast.error(e.message) });
  const del = trpc.admin.waDelete.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    upsert.mutate({
      name: String(f.get('name')),
      inviteUrl: String(f.get('inviteUrl')),
      categorySlug: String(f.get('category')) || undefined,
      emirateSlug: String(f.get('emirate')) || undefined,
      description: String(f.get('description')) || undefined,
      memberCount: Number(f.get('memberCount')) || 0,
      isActive: true,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">WhatsApp Groups</h1>
        <Button onClick={() => setOpen((v) => !v)}><Plus /> Add Group</Button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Name</Label><Input name="name" required /></div>
          <div className="space-y-1.5"><Label>Invite URL</Label><Input name="inviteUrl" required placeholder="https://chat.whatsapp.com/…" /></div>
          <div className="space-y-1.5"><Label>Category</Label><Select name="category"><option value="">Any</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></div>
          <div className="space-y-1.5"><Label>Emirate</Label><Select name="emirate"><option value="">Any</option>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></div>
          <div className="space-y-1.5"><Label>Members</Label><Input name="memberCount" type="number" defaultValue={0} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Input name="description" /></div>
          <div className="sm:col-span-2"><Button type="submit" disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="animate-spin" />} Save</Button></div>
        </form>
      )}

      <div className="mt-6 space-y-2">
        {groups.isLoading && <Loader2 className="animate-spin text-teal-500" />}
        {groups.data?.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
            <div>
              <p className="font-semibold text-navy-900">{g.name}</p>
              <p className="text-xs text-navy-700/50">{[g.categorySlug, g.emirateSlug].filter(Boolean).join(' · ')} · <Users className="inline h-3 w-3" /> {g.memberCount}</p>
            </div>
            <div className="flex items-center gap-2">
              {!g.isActive && <Badge variant="muted">inactive</Badge>}
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: g.id })}><Trash2 className="text-red-500" /></Button>
            </div>
          </div>
        ))}
        {groups.data?.length === 0 && <p className="rounded-xl border bg-white p-8 text-center text-navy-700/60">No groups yet.</p>}
      </div>
    </div>
  );
}
