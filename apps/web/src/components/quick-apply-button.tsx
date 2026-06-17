'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Zap, X, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select } from '@/components/ui/primitives';

/** No-login Quick Apply: opens a modal, sends name + WhatsApp to the employer. */
export function QuickApplyButton({ jobId, className, preferWhatsapp, preferEmail }: { jobId: string; className?: string; preferWhatsapp?: string | null; preferEmail?: string | null }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ name: '', whatsapp: '', experienceYears: '', message: '' });
  const apply = trpc.applications.quickApply.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(e.message),
  });

  function submit() {
    if (f.name.trim().length < 2) return toast.error('Enter your name');
    if (f.whatsapp.replace(/\D/g, '').length < 6) return toast.error('Enter a valid WhatsApp number');
    apply.mutate({ jobId, name: f.name.trim(), whatsapp: f.whatsapp.trim(), experienceYears: f.experienceYears || undefined, message: f.message.trim() || undefined });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 ${className ?? ''}`}
      >
        <Zap className="h-4 w-4" /> Quick Apply
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full bg-white sm:max-w-md sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="font-display text-lg font-bold text-navy-900">Quick Apply</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-navy-50"><X className="h-5 w-5" /></button>
            </div>

            {done ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                <p className="mt-3 font-semibold text-navy-900">Sent! Employer will contact you.</p>
                <Button className="mt-5 w-full" onClick={() => setOpen(false)}>Done</Button>
              </div>
            ) : (
              <div className="space-y-3 p-5">
                {(preferWhatsapp || preferEmail) && (
                  <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">
                    {preferWhatsapp ? 'This employer prefers applications via WhatsApp.' : `Send your CV to: ${preferEmail}`}
                  </p>
                )}
                <div className="space-y-1.5"><Label>Your name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name" /></div>
                <div className="space-y-1.5"><Label>WhatsApp number *</Label><Input type="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="+971 50 123 4567" /></div>
                <div className="space-y-1.5">
                  <Label>Experience</Label>
                  <Select value={f.experienceYears} onChange={(e) => setF({ ...f, experienceYears: e.target.value })}>
                    <option value="">Select (optional)</option>
                    <option value="0-1 years">0–1 years</option>
                    <option value="1-3 years">1–3 years</option>
                    <option value="3-5 years">3–5 years</option>
                    <option value="5-10 years">5–10 years</option>
                    <option value="10+ years">10+ years</option>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Short message (optional)</Label><Textarea maxLength={200} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Why you're a good fit…" /></div>
                <Button className="w-full" onClick={submit} disabled={apply.isPending}>
                  {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Send Application
                </Button>
                <p className="text-center text-xs text-navy-700/50">No account needed. The employer gets your details on WhatsApp.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
