'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Plus, X, FolderPlus, Bookmark } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { JobCard } from '@/components/job-card';
import { Input, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SavedJobsPage() {
  const utils = trpc.useUtils();
  const saved = trpc.jobseekers.savedJobs.useQuery();
  const folders = trpc.jobseekers.savedFolders.useQuery();

  const [filter, setFilter] = useState<string | null>(null); // null = All
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2a9aa4');

  const invalAll = () => { utils.jobseekers.savedJobs.invalidate(); utils.jobseekers.savedFolders.invalidate(); };
  const create = trpc.jobseekers.createFolder.useMutation({ onSuccess: () => { invalAll(); setName(''); setShowNew(false); toast.success('Folder created'); } });
  const del = trpc.jobseekers.deleteFolder.useMutation({ onSuccess: () => { invalAll(); toast.success('Folder deleted'); } });
  const move = trpc.jobseekers.moveSavedJob.useMutation({ onSuccess: () => utils.jobseekers.savedJobs.invalidate() });

  const rows = saved.data ?? [];
  const shown = filter === null ? rows : rows.filter((s) => s.folderId === filter);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Bookmark className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Saved Jobs</h1></div>
        <Button variant="outline" onClick={() => setShowNew((s) => !s)}>{showNew ? <X /> : <FolderPlus />} {showNew ? 'Cancel' : 'New folder'}</Button>
      </div>

      {showNew && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
          <div className="flex-1 space-y-1.5"><label className="text-sm font-medium">Folder name</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dream jobs" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Colour</label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 p-1" /></div>
          <Button onClick={() => create.mutate({ name, color })} disabled={create.isPending || name.trim().length === 0}>{create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Create</Button>
        </div>
      )}

      {/* Folder filter chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter(null)} className={cn('rounded-full border px-3 py-1 text-sm', filter === null ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white text-navy-700')}>All ({rows.length})</button>
        {folders.data?.map((f) => {
          const n = rows.filter((s) => s.folderId === f.id).length;
          return (
            <span key={f.id} className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm', filter === f.id ? 'border-teal-500 bg-teal-50' : 'bg-white')}>
              <button onClick={() => setFilter(f.id)} className="inline-flex items-center gap-1.5 text-navy-800">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} /> {f.name} ({n})
              </button>
              <button onClick={() => { if (confirm(`Delete folder "${f.name}"? Jobs stay saved.`)) del.mutate({ id: f.id }); }} className="text-navy-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
            </span>
          );
        })}
      </div>

      {saved.isLoading ? (
        <Loader2 className="mt-8 animate-spin text-teal-500" />
      ) : shown.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-white p-12 text-center text-navy-700/60">
          {rows.length === 0 ? <>No saved jobs yet. <Link href="/jobs" className="font-semibold text-teal-600 hover:underline">Browse jobs</Link></> : 'No jobs in this folder.'}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {shown.map((s) => (
            <div key={s.jobId} className="space-y-2">
              <JobCard job={s.job} />
              {(folders.data?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2 px-1 text-xs text-navy-700/60">
                  <span>Folder:</span>
                  <Select className="h-8 w-40 text-xs" value={s.folderId ?? ''} onChange={(e) => move.mutate({ jobId: s.jobId, folderId: e.target.value || null })}>
                    <option value="">No folder</option>
                    {folders.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </Select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
