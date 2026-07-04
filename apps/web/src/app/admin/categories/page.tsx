'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, X, ArrowUp, ArrowDown, ListPlus } from 'lucide-react';
import { slugify } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Badge } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/switch';

type Cat = {
  id: string; slug: string; name: string; nameAr: string | null; icon: string | null;
  parentId: string | null; sortOrder: number; isActive: boolean; jobCount: number; subCount: number;
};
type Tab = 'categories' | 'subcategories';

export default function AdminCategoriesPage() {
  const utils = trpc.useUtils();
  const q = trpc.admin.getCategories.useQuery();
  const [tab, setTab] = useState<Tab>('categories');
  const [editing, setEditing] = useState<Cat | { parentId: string | null } | null>(null);
  const inval = () => utils.admin.getCategories.invalidate();

  const del = trpc.admin.deleteCategory.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); }, onError: (e) => toast.error(e.message) });
  const update = trpc.admin.updateCategory.useMutation({ onSuccess: () => inval(), onError: (e) => toast.error(e.message) });

  const rows = (q.data ?? []) as Cat[];
  const parents = useMemo(() => rows.filter((c) => !c.parentId), [rows]);
  const subs = useMemo(() => rows.filter((c) => c.parentId), [rows]);
  const parentName = (id: string | null) => parents.find((p) => p.id === id)?.name ?? '—';

  // Swap sortOrder with the neighbouring parent to reorder.
  function move(i: number, dir: -1 | 1) {
    const a = parents[i], b = parents[i + dir];
    if (!a || !b) return;
    update.mutate({ id: a.id, name: a.name, nameAr: a.nameAr, icon: a.icon, parentId: a.parentId, sortOrder: b.sortOrder, isActive: a.isActive });
    update.mutate({ id: b.id, name: b.name, nameAr: b.nameAr, icon: b.icon, parentId: b.parentId, sortOrder: a.sortOrder, isActive: b.isActive });
  }
  const toggle = (c: Cat) => update.mutate({ id: c.id, name: c.name, nameAr: c.nameAr, icon: c.icon, parentId: c.parentId, sortOrder: c.sortOrder, isActive: !c.isActive });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Categories</h1>
        {tab === 'categories'
          ? <Button onClick={() => setEditing({ parentId: null })}><Plus className="h-4 w-4" /> Add category</Button>
          : <Button onClick={() => setEditing({ parentId: parents[0]?.id ?? null })} disabled={!parents.length}><Plus className="h-4 w-4" /> Add subcategory</Button>}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b">
        {(['categories', 'subcategories'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-teal-500 text-teal-600' : 'border-transparent text-navy-700/60 hover:text-navy-900'}`}
          >
            {t}{t === 'subcategories' ? ` (${subs.length})` : ` (${parents.length})`}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <Loader2 className="mt-6 animate-spin text-teal-500" />
      ) : tab === 'categories' ? (
        <CategoriesTable parents={parents} onEdit={setEditing} onDelete={(c) => { if (confirm(`Delete "${c.name}"?`)) del.mutate({ id: c.id }); }} onToggle={toggle} move={move} />
      ) : (
        <SubcategoriesPanel subs={subs} parents={parents} parentName={parentName} onEdit={setEditing} onDelete={(c) => { if (confirm(`Delete "${c.name}"?`)) del.mutate({ id: c.id }); }} onDone={inval} />
      )}

      {editing && (
        <CategoryModal
          cat={'id' in editing ? editing : null}
          defaultParentId={'id' in editing ? editing.parentId : editing.parentId}
          isSub={tab === 'subcategories' || ('id' in editing ? !!editing.parentId : false)}
          parents={parents}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); inval(); }}
        />
      )}
    </div>
  );
}

function CategoriesTable({ parents, onEdit, onDelete, onToggle, move }: {
  parents: Cat[]; onEdit: (c: Cat) => void; onDelete: (c: Cat) => void; onToggle: (c: Cat) => void; move: (i: number, d: -1 | 1) => void;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b bg-navy-50 text-left text-navy-700">
          <tr><th className="px-4 py-3">Icon</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Jobs</th><th className="px-4 py-3">Subcats</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Active</th><th className="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          {parents.map((c, i) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="px-4 py-3 text-navy-700/60">{c.icon ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-navy-900">{c.name}{c.nameAr && <span className="block text-xs font-normal text-navy-700/50" dir="rtl">{c.nameAr}</span>}</td>
              <td className="px-4 py-3 text-navy-700/60">{c.slug}</td>
              <td className="px-4 py-3 text-navy-700/60">{c.jobCount.toLocaleString('en-AE')}</td>
              <td className="px-4 py-3 text-navy-700/60">{c.subCount}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-navy-600 hover:bg-navy-50 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === parents.length - 1} className="rounded p-1 text-navy-600 hover:bg-navy-50 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                </div>
              </td>
              <td className="px-4 py-3">
                <button onClick={() => onToggle(c)} title="Toggle active">{c.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Hidden</Badge>}</button>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(c)} title="Edit"><Pencil /></Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => onDelete(c)}><Trash2 className="text-red-500" /></Button>
                </div>
              </td>
            </tr>
          ))}
          {parents.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-navy-700/60">No categories.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SubcategoriesPanel({ subs, parents, parentName, onEdit, onDelete, onDone }: {
  subs: Cat[]; parents: Cat[]; parentName: (id: string | null) => string; onEdit: (c: Cat) => void; onDelete: (c: Cat) => void; onDone: () => void;
}) {
  const [filter, setFilter] = useState<string>('all');
  const shown = filter === 'all' ? subs : subs.filter((s) => s.parentId === filter);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-sm">Filter by parent</Label>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-56">
          <option value="all">All categories</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-navy-50 text-left text-navy-700">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Jobs</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium text-navy-900">{c.name}</td>
                <td className="px-4 py-3 text-navy-700/60">{c.slug}</td>
                <td className="px-4 py-3 text-navy-700/60">{parentName(c.parentId)}</td>
                <td className="px-4 py-3 text-navy-700/60">{c.jobCount.toLocaleString('en-AE')}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(c)} title="Edit"><Pencil /></Button>
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => onDelete(c)}><Trash2 className="text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-navy-700/60">No subcategories.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-navy-700/50">Jobs are tagged by parent category only, so subcategory job counts stay 0.</p>

      <BulkAdd parents={parents} defaultParentId={filter !== 'all' ? filter : parents[0]?.id} onDone={onDone} />
    </div>
  );
}

function BulkAdd({ parents, defaultParentId, onDone }: { parents: Cat[]; defaultParentId?: string; onDone: () => void }) {
  const [parentId, setParentId] = useState<string>(defaultParentId ?? '');
  const [text, setText] = useState('');
  const bulk = trpc.admin.bulkAddSubcategories.useMutation({
    onSuccess: (r) => { toast.success(`Added ${r.added} subcategor${r.added === 1 ? 'y' : 'ies'}`); setText(''); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  function submit() {
    const names = text.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!parentId) return toast.error('Select a parent category');
    if (!names.length) return toast.error('Enter at least one subcategory');
    bulk.mutate({ parentId, names });
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="flex items-center gap-2 font-display font-bold text-navy-900"><ListPlus className="h-4 w-4 text-teal-500" /> Bulk add subcategories</h3>
      <p className="mt-1 text-sm text-navy-700/60">One subcategory per line — inserted under the selected parent.</p>
      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label>Parent category</Label>
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full sm:w-64">
            <option value="">Select…</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={'Web Development\nMobile Apps\nDevOps'}
          className="w-full rounded-lg border border-navy-200 p-3 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
        <Button onClick={submit} disabled={bulk.isPending}>{bulk.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add all</Button>
      </div>
    </div>
  );
}

function CategoryModal({ cat, defaultParentId, isSub, parents, onClose, onDone }: {
  cat: Cat | null; defaultParentId: string | null; isSub: boolean; parents: Cat[]; onClose: () => void; onDone: () => void;
}) {
  const [f, setF] = useState({
    name: cat?.name ?? '', nameAr: cat?.nameAr ?? '', slug: cat?.slug ?? '', icon: cat?.icon ?? '',
    sortOrder: cat?.sortOrder ?? 0, isActive: cat?.isActive ?? true,
    parentId: cat?.parentId ?? defaultParentId ?? '',
  });
  const create = trpc.admin.createCategory.useMutation({ onSuccess: () => { toast.success('Created'); onDone(); }, onError: (e) => toast.error(e.message) });
  const update = trpc.admin.updateCategory.useMutation({ onSuccess: () => { toast.success('Saved'); onDone(); }, onError: (e) => toast.error(e.message) });
  const busy = create.isPending || update.isPending;

  function save() {
    if (f.name.trim().length < 2) return toast.error('Name too short');
    const parentId = isSub ? (f.parentId || null) : null;
    if (isSub && !parentId) return toast.error('Select a parent category');
    if (cat) update.mutate({ id: cat.id, name: f.name, nameAr: f.nameAr || null, icon: f.icon || null, parentId, sortOrder: Number(f.sortOrder) || 0, isActive: f.isActive });
    else create.mutate({ name: f.name, nameAr: f.nameAr || undefined, slug: f.slug || undefined, icon: f.icon || undefined, parentId: parentId ?? undefined, sortOrder: Number(f.sortOrder) || 0, isActive: f.isActive });
  }

  const title = cat ? (isSub ? 'Edit subcategory' : 'Edit category') : (isSub ? 'Add subcategory' : 'Add category');

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full bg-white sm:max-w-md sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-display text-lg font-bold text-navy-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-5">
          {isSub && (
            <div className="space-y-1.5">
              <Label>Parent category</Label>
              <Select value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}>
                <option value="">Select…</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>Name (English)</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: cat ? f.slug : slugify(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Name (Arabic)</Label><Input dir="rtl" value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Slug</Label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} disabled={!!cat} placeholder="auto-generated" /></div>
          <div className="space-y-1.5"><Label>Icon (emoji or Lucide name)</Label><Input value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} placeholder="e.g. Laptop or 💼" /></div>
          <div className="space-y-1.5"><Label>Sort order</Label><Input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} className="w-28" /></div>
          <div className="flex items-center justify-between py-1"><Label>Active</Label><Switch checked={f.isActive} onCheckedChange={(v) => setF({ ...f, isActive: v })} /></div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {cat ? 'Save' : 'Create'}</Button>
        </div>
      </div>
    </div>
  );
}
