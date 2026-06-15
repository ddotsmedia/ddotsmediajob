'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShieldCheck, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';

export function TwoFactorCard() {
  const utils = trpc.useUtils();
  const status = trpc.admin.twoFactorStatus.useQuery();
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState<string[] | null>(null);

  const setup = trpc.admin.twoFactorSetup.useMutation({
    onSuccess: (d) => setQr(d.qrDataUrl),
    onError: (e) => toast.error(e.message),
  });
  const enable = trpc.admin.twoFactorEnable.useMutation({
    onSuccess: (d) => { setBackup(d.backupCodes); setQr(null); setCode(''); utils.admin.twoFactorStatus.invalidate(); toast.success('2FA enabled'); },
    onError: (e) => toast.error(e.message),
  });
  const disable = trpc.admin.twoFactorDisable.useMutation({
    onSuccess: () => { setCode(''); setBackup(null); utils.admin.twoFactorStatus.invalidate(); toast.success('2FA disabled'); },
    onError: (e) => toast.error(e.message),
  });

  const enabled = status.data?.enabled ?? false;

  return (
    <div className="mt-6 rounded-xl border bg-white p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-teal-500" />
        <h2 className="font-display text-sm font-bold text-navy-900">Two-factor authentication (TOTP)</h2>
        <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? 'bg-green-50 text-green-700' : 'bg-navy-50 text-navy-500'}`}>
          <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-navy-300'}`} />
          {enabled ? 'Enabled' : 'Off'}
        </span>
      </div>
      <p className="mt-1 text-xs text-navy-700/60">Protect your admin account with an authenticator app (Google Authenticator, Authy, 1Password).</p>

      {/* Backup codes shown once after enabling. */}
      {backup && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Save these 8 backup codes now — they are shown only once.</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-sm text-navy-900 sm:grid-cols-4">
            {backup.map((c) => <span key={c} className="rounded bg-white px-2 py-1 text-center">{c}</span>)}
          </div>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => { void navigator.clipboard.writeText(backup.join('\n')); toast.success('Copied'); }}>
            <Copy className="h-3.5 w-3.5" /> Copy all
          </Button>
        </div>
      )}

      {!enabled && !qr && !backup && (
        <Button className="mt-4" onClick={() => setup.mutate()} disabled={setup.isPending}>
          {setup.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Set up 2FA
        </Button>
      )}

      {/* Setup step: scan QR, enter code. */}
      {qr && (
        <div className="mt-4 space-y-3">
          <Image src={qr} alt="2FA QR code" width={220} height={220} unoptimized className="rounded-lg border" />
          <p className="text-xs text-navy-700/60">Scan with your authenticator app, then enter the 6-digit code to confirm.</p>
          <div className="flex flex-wrap gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="6-digit code" className="w-40" />
            <Button onClick={() => enable.mutate({ code })} disabled={enable.isPending || code.length < 6}>
              {enable.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Verify & enable
            </Button>
          </div>
        </div>
      )}

      {enabled && !backup && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-navy-700/60">{status.data?.backupCodesLeft ?? 0} backup codes remaining. To turn off 2FA, enter a current code.</p>
          <div className="flex flex-wrap gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="Current code or backup code" className="w-56" />
            <Button variant="outline" onClick={() => disable.mutate({ code })} disabled={disable.isPending || code.length < 6}>
              {disable.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Disable 2FA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
