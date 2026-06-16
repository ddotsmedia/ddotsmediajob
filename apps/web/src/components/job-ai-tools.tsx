'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2, FileText, MessagesSquare, X, Copy, Download } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Label, Select } from '@/components/ui/primitives';

/** Login-gated AI helpers on a job: cover-letter generator + interview prep. */
export function JobAiTools({ jobId }: { jobId: string }) {
  const { status } = useSession();
  const [open, setOpen] = useState<null | 'cover' | 'interview'>(null);
  if (status !== 'authenticated') return null;

  return (
    <div className="space-y-3">
      <Button variant="outline" className="w-full" onClick={() => setOpen('cover')}><FileText className="h-4 w-4" /> Generate Cover Letter</Button>
      <Button variant="outline" className="w-full" onClick={() => setOpen('interview')}><MessagesSquare className="h-4 w-4" /> Prepare for Interview</Button>
      {open === 'cover' && <CoverModal jobId={jobId} onClose={() => setOpen(null)} />}
      {open === 'interview' && <InterviewModal jobId={jobId} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full flex-col bg-white sm:max-w-lg sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <h2 className="font-display text-lg font-bold text-navy-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function CoverModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [tone, setTone] = useState<'professional' | 'casual' | 'enthusiastic'>('professional');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const gen = trpc.ai.coverLetter.useMutation({ onError: (e) => toast.error(e.message) });
  const text = gen.data?.coverLetter ?? '';

  function download() {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cover-letter.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell title="Cover Letter Generator" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Tone</Label><Select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}><option value="professional">Professional</option><option value="casual">Casual</option><option value="enthusiastic">Enthusiastic</option></Select></div>
        <div className="space-y-1.5"><Label>Language</Label><Select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}><option value="en">English</option><option value="ar">العربية</option></Select></div>
      </div>
      <Button className="mt-3 w-full" onClick={() => gen.mutate({ jobId, tone, language })} disabled={gen.isPending}>
        {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} {text ? 'Regenerate' : 'Generate'}
      </Button>
      {text && (
        <>
          <div className={`mt-4 whitespace-pre-wrap rounded-lg border bg-navy-50/50 p-4 text-sm text-navy-800 ${language === 'ar' ? 'text-right' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>{text}</div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(text); toast.success('Copied'); }}><Copy className="h-3.5 w-3.5" /> Copy</Button>
            <Button variant="outline" size="sm" onClick={download}><Download className="h-3.5 w-3.5" /> Download</Button>
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-navy-700/50">5 generations per day.</p>
    </Shell>
  );
}

function InterviewModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const gen = trpc.ai.jobInterviewQuestions.useMutation({ onError: (e) => toast.error(e.message) });
  const text = gen.data?.content ?? '';
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) { started.current = true; gen.mutate({ jobId }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);
  return (
    <Shell title="Interview Prep" onClose={onClose}>
      {gen.isPending && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>}
      {text && (
        <>
          <div className="whitespace-pre-wrap text-sm text-navy-800">{text}</div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => { void navigator.clipboard.writeText(text); toast.success('Copied'); }}><Copy className="h-3.5 w-3.5" /> Copy</Button>
        </>
      )}
      {gen.isError && <Button className="w-full" onClick={() => gen.mutate({ jobId })}>Try again</Button>}
    </Shell>
  );
}
