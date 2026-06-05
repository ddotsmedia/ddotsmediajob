'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';

export default function QuickPostPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-center text-navy-700/60">Loading…</div>}>
      <QuickPostForm />
    </Suspense>
  );
}

function QuickPostForm() {
  const token = useSearchParams().get('token') ?? '';
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ url: string } | null>(null);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/quick-post', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          title: f.get('title'),
          emirate: f.get('emirate'),
          salary: f.get('salary'),
          contact_whatsapp: f.get('contact_whatsapp'),
          description: f.get('description'),
          visa_provided: f.get('visa_provided') === 'on',
          accommodation: f.get('accommodation') === 'on',
          urgent: f.get('urgent') === 'on',
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setDone({ url: json.url! });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h1 className="mt-4 font-display text-xl font-bold text-navy-900">Job Posted!</h1>
        <a href={done.url} className="mt-2 block break-all text-teal-600 underline">{done.url}</a>
        <button onClick={() => setDone(null)} className="mt-6 w-full rounded-lg bg-teal-600 py-3 font-semibold text-white">Post Another</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-navy-900">Quick Post a Job</h1>
      <p className="mt-1 text-sm text-navy-700/60">Fast mobile posting. Goes live instantly.</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input name="title" required minLength={3} placeholder="Job title *" className="w-full rounded-lg border border-navy-200 px-4 py-3 text-base" />
        <select name="emirate" required defaultValue="" className="w-full rounded-lg border border-navy-200 px-4 py-3 text-base">
          <option value="" disabled>Emirate *</option>
          {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
        </select>
        <input name="salary" placeholder="Salary e.g. 5000-7000 AED" className="w-full rounded-lg border border-navy-200 px-4 py-3 text-base" />
        <input name="contact_whatsapp" type="tel" required placeholder="WhatsApp contact *" className="w-full rounded-lg border border-navy-200 px-4 py-3 text-base" />
        <textarea name="description" rows={3} placeholder="Short description" className="w-full rounded-lg border border-navy-200 px-4 py-3 text-base" />
        <div className="flex flex-wrap gap-4 text-sm text-navy-700">
          {(['visa_provided', 'accommodation', 'urgent'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} className="h-4 w-4" /> {k.replace('_', ' ')}</label>
          ))}
        </div>
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-4 text-lg font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="animate-spin" /> : <Send />} Post Job Now
        </button>
      </form>
    </div>
  );
}
