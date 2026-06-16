'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { slugify } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Badge } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/switch';

type Cat = { id: string; slug: string; name: string; nameAr: string | null; icon: string | null; parentId: string | null; sortOrder: number; isActive: boolean; jobCount: number };

export default function AdminCategoriesPage() {
  const utils = trpc.useUtils();
  const q = trpc.admin.getCategories.useQuery();
  const [editing, setEditing] = useState<Cat | 'new' | null>(null);
  const inval = () => utils.admin.getCategories.invalidate();

  const del = trpc.admin.deleteCategory.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); }, onError: (e) => toast.error(e.message) });
  const update = trpc.admin.updateCategory.useMutation({ onSuccess: () => { inval(); }, onError: (e) => toast.error(e.message) });

  const rows = (q.data ?? []) as Cat[];

  // Reorder by swapping sortOrder with the neighbour.
  function move(i: number, dir: -1 | 1) {
    const a = rows[i], b = rows[i + dir];
    if (!a || !b) return;
    update.mutate({ id: a.id, name: a.name, nameAr: a.nameAr, icon: a.icon, parentId: a.parentId, sortOrder: b.sortOrder, isActive: a.isActive });
    update.mutate({ id: b.id, name: b.name, nameAr: b.nameAr, icon: b.icon, parentId: b.parentId, sortOrder: a.sortOrder, isActive: b.isActive });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Categories</h1>
        <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add category</Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {q.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Icon</th><th className="px-4 py-3">Jobs</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Order</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{c.name}{c.nameAr && <span className="block text-xs font-normal text-navy-700/50" dir="rtl">{c.nameAr}</span>}</td>
                  <td className="px-4 py-3 text-navy-700/60">{c.slug}</td>
                  <td className="px-4 py-3 text-navy-700/60">{c.icon ?? '—'}</td>
                  <td className="px-4 py-3 text-navy-700/60">{c.jobCount}</td>
                  <td className="px-4 py-3">{c.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Hidden</Badge>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-navy-600 hover:bg-navy-50 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1 text-navy-600 hover:bg-navy-50 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(c)} title="Edit"><Pencil /></Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm(`Delete "${c.name}"?`)) del.mutate({ id: c.id }); }}><Trash2 className="text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-navy-700/60">No categories.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && <CategoryModal cat={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); inval(); }} />}
    </div>
  );
}

function CategoryModal({ cat, onClose, onDone }: { cat: Cat | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    name: cat?.name ?? '', nameAr: cat?.nameAr ?? '', slug: cat?.slug ?? '', icon: cat?.icon ?? '',
    sortOrder: cat?.sortOrder ?? 0, isActive: cat?.isActive ?? true,
  });
  const create = trpc.admin.createCategory.useMutation({ onSuccess: () => { toast.success('Created'); onDone(); }, onError: (e) => toast.error(e.message) });
  const update = trpc.admin.updateCategory.useMutation({ onSuccess: () => { toast.success('Saved'); onDone(); }, onError: (e) => toast.error(e.message) });
  const busy = create.isPending || update.isPending;

  function save() {
    if (f.name.trim().length < 2) return toast.error('Name too short');
    if (cat) update.mutate({ id: cat.id, name: f.name, nameAr: f.nameAr || null, icon: f.icon || null, parentId: cat.parentId, sortOrder: Number(f.sortOrder) || 0, isActive: f.isActive });
    else create.mutate({ name: f.name, nameAr: f.nameAr || undefined, slug: f.slug || undefined, icon: f.icon || undefined, sortOrder: Number(f.sortOrder) || 0, isActive: f.isActive });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full bg-white sm:max-w-md sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-display text-lg font-bold text-navy-900">{cat ? 'Edit category' : 'Add category'}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="space-y-1.5"><Label>Name (English)</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: cat ? f.slug : slugify(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Name (Arabic)</Label><Input dir="rtl" value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Slug</Label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} disabled={!!cat} placeholder="auto-generated" /></div>
          <div className="space-y-1.5"><Label>Icon (emoji or Tabler/Lucide name)</Label><Input value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} placeholder="e.g. Laptop or 💼" /></div>
          <div className="space-y-1.5"><Label>Sort order</Label><Input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} className="w-28" /></div>
          <div className="flex items-center justify-between py-1"><Label>Active</Label><Switch checked={f.isActive} onCheckedChange={(v) => setF({ ...f, isActive: v })} /></div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {cat ? 'Save' : 'Create'}</Button>
        </div>
      </div>
    </div>
  );
}
