'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/primitives';

const TYPES = [
  { v: 'general', l: 'General Feedback' },
  { v: 'bug', l: 'Bug Report' },
  { v: 'suggestion', l: 'Suggestion' },
  { v: 'partnership', l: 'Partnership Inquiry' },
  { v: 'complaint', l: 'Complaint' },
] as const;

export function FeedbackForm() {
  const { data: session } = useSession();
  const [done, setDone] = useState(false);
  const [f, setF] = useState({
    name: session?.user?.name ?? '',
    email: session?.user?.email ?? '',
    phone: '',
    subject: '',
    type: 'general' as (typeof TYPES)[number]['v'],
    message: '',
  });
  const submit = trpc.feedback.submit.useMutation({ onSuccess: () => setDone(true), onError: (e) => toast.error(e.message) });

  function send() {
    if (f.name.trim().length < 2) return toast.error('Enter your name');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast.error('Enter a valid email');
    if (f.subject.trim().length < 2) return toast.error('Enter a subject');
    if (f.message.trim().length < 20) return toast.error('Message must be at least 20 characters');
    submit.mutate({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, subject: f.subject.trim(), type: f.type, message: f.message.trim() });
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-4 font-display text-xl font-bold text-navy-900">Thank you!</h2>
        <p className="mt-1 text-navy-700/70">We&apos;ll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" /></div>
        <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" /></div>
        <div className="space-y-1.5"><Label>Phone (optional)</Label><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+971 50 123 4567" /></div>
        <div className="space-y-1.5"><Label>Type</Label><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as typeof f.type })}>{TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</Select></div>
      </div>
      <div className="space-y-1.5"><Label>Subject *</Label><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="How can we help?" /></div>
      <div className="space-y-1.5"><Label>Message *</Label><Textarea className="min-h-[140px]" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Tell us more (min 20 characters)…" /></div>
      <Button className="w-full" onClick={send} disabled={submit.isPending}>
        {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Feedback
      </Button>
    </div>
  );
}
