'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, Upload, ExternalLink } from 'lucide-react';
import { trpc } from '@/trpc/react';

const ACCEPT = '.pdf,.doc,.docx';
const OK_EXT = /\.(pdf|docx?|DOC|DOCX|PDF)$/;

/** CV uploader → Cloudflare R2, saved to the jobseeker profile (resumeUrl). */
export function CvUpload({
  initialUrl,
  initialName,
  initialAt,
}: {
  initialUrl: string | null;
  initialName: string | null;
  initialAt: string | Date | null;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [name, setName] = useState<string | null>(initialName);
  const [at, setAt] = useState<string | Date | null>(initialAt);
  const [busy, setBusy] = useState(false);
  const presign = trpc.jobseekers.presignResume.useMutation();
  const save = trpc.jobseekers.setResume.useMutation();

  async function upload(file: File) {
    if (!OK_EXT.test(file.name)) return toast.error('CV must be a PDF, DOC or DOCX');
    if (file.size > 5_000_000) return toast.error('CV must be under 5 MB');
    setBusy(true);
    try {
      const { uploadUrl, publicUrl } = await presign.mutateAsync({ filename: file.name, contentType: file.type || 'application/pdf' });
      const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/pdf' } });
      if (!res.ok) throw new Error('upload failed');
      await save.mutateAsync({ url: publicUrl, filename: file.name });
      setUrl(publicUrl);
      setName(file.name);
      setAt(new Date());
      toast.success('CV uploaded');
    } catch {
      toast.error('Upload failed — please try again');
    } finally {
      setBusy(false);
    }
  }

  const dateLabel = at ? new Date(at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="flex items-center gap-2 font-display font-bold text-navy-900"><FileText className="h-4 w-4 text-teal-500" /> Your CV</h2>
      <p className="mt-1 text-sm text-navy-700/60">Upload your CV (PDF, DOC or DOCX, max 5 MB). Employers see it when you apply.</p>

      {url ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-navy-50/40 px-4 py-3">
          <FileText className="h-8 w-8 shrink-0 text-teal-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">{name ?? 'My CV'}</p>
            {dateLabel && <p className="text-xs text-navy-700/50">Uploaded {dateLabel}</p>}
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-white">
            <ExternalLink className="h-3.5 w-3.5" /> View
          </a>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-100">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Replace
            <input type="file" accept={ACCEPT} className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <label className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-navy-200 px-4 py-8 text-center hover:border-teal-400 hover:bg-teal-50/30">
          {busy ? <Loader2 className="h-6 w-6 animate-spin text-teal-500" /> : <Upload className="h-6 w-6 text-navy-400" />}
          <span className="text-sm font-medium text-navy-700">{busy ? 'Uploading & parsing…' : 'Upload your CV'}</span>
          <span className="text-xs text-navy-700/50">PDF, DOC or DOCX · max 5 MB</span>
          <input type="file" accept={ACCEPT} className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}
