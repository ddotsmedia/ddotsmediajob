'use client';

import { useEffect, useState } from 'react';
import { Gift, Copy, Loader2, MessageCircle, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddotsmediajobs.com';

export default function InvitePage() {
  const ensure = trpc.communityHub.myReferralCode.useMutation();
  const stats = trpc.communityHub.referralStats.useQuery();
  const board = trpc.communityHub.referralLeaderboard.useQuery();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    ensure.mutate(undefined, { onSuccess: (r) => { setCode(r?.code ?? null); stats.refetch(); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const link = code ? `${SITE}/join/${code}` : '';
  const waText = `Join DdotsMediaJobs — UAE's fastest growing job portal! 120,000+ job seekers. AI-powered matching. Free.\nJoin via my link: ${link}`;
  function copy(t: string) { navigator.clipboard.writeText(t).then(() => toast.success('Copied')).catch(() => toast.error('Copy failed')); }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Refer friends. Grow together.</h1></div>
      <p className="text-navy-700/60">Share your link. Earn points when friends join and apply.</p>

      <div className="mt-5 rounded-xl border bg-white p-5">
        {!code ? <Loader2 className="animate-spin text-teal-500" /> : (
          <>
            <p className="text-sm text-navy-700/60">Your referral link</p>
            <div className="mt-1.5 flex gap-2">
              <input readOnly value={link} className="flex-1 rounded-lg border bg-navy-50 px-3 py-2 text-sm" />
              <Button size="sm" onClick={() => copy(link)}><Copy className="h-4 w-4" /></Button>
            </div>
            <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"><MessageCircle className="h-4 w-4" /> Share on WhatsApp</a>
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Clicks" value={stats.data?.clicks ?? 0} />
        <Stat label="Conversions" value={stats.data?.conversions ?? 0} />
        <Stat label="Code" value={code ?? '—'} small />
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-900"><Trophy className="h-5 w-5 text-yellow-500" /> Top referrers</h2>
        <div className="mt-3 space-y-1">
          {board.data?.length ? board.data.map((b, i) => (
            <div key={b.code} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm odd:bg-navy-50/60"><span className="font-medium text-navy-900">#{i + 1} {b.code}</span><span className="text-navy-700/60">{b.conversions} joined</span></div>
          )) : <p className="text-sm text-navy-700/50">No referrals yet — be the first!</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return <div className="rounded-xl border bg-white p-4 text-center"><p className={small ? 'font-display text-base font-bold text-navy-900' : 'font-display text-2xl font-bold text-navy-900'}>{value}</p><p className="text-xs text-navy-700/60">{label}</p></div>;
}
