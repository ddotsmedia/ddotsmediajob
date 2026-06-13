'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const track = trpc.communityHub.trackReferralClick.useMutation();
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    try { localStorage.setItem('ddots-ref', code); } catch { /* ignore */ }
    track.mutate({ code }, { onSuccess: (r) => setValid(r.valid), onError: () => setValid(false) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700"><Sparkles className="h-4 w-4" /> You&apos;ve been invited</span>
      <h1 className="mt-4 font-display text-3xl font-bold text-navy-900">Join DdotsMediaJobs</h1>
      <p className="mt-2 text-navy-700/70">UAE&apos;s fastest-growing job portal — 120,000+ job seekers, AI-powered matching, free.</p>

      <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm text-navy-700/80">
        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Instant job alerts</li>
        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> AI CV builder</li>
        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Apply in one click</li>
      </ul>

      <Link href={`/register?ref=${code}`} className="mt-7 inline-block w-full rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700">Create free account</Link>
      <p className="mt-3 text-xs text-navy-700/50">{valid === null ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : valid ? 'Referral applied ✓' : 'Welcome!'}</p>
    </div>
  );
}
