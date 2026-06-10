'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Bell, X, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSubscribe() {
  const key = trpc.push.vapidPublicKey.useQuery();
  const subscribe = trpc.push.subscribe.useMutation();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!key.data) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'default') setShow(true);
  }, [key.data]);

  if (!show || !key.data) return null;

  async function enable() {
    if (!key.data) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setShow(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key.data) as BufferSource });
      const json = s.toJSON();
      if (!json.endpoint || !json.keys) throw new Error('bad subscription');
      await subscribe.mutateAsync({ endpoint: json.endpoint, p256dh: json.keys.p256dh!, auth: json.keys.auth! });
      toast.success('Notifications enabled');
      setShow(false);
    } catch {
      toast.error('Could not enable notifications');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm text-navy-800"><Bell className="h-4 w-4 text-teal-600" /> Get notified about messages, shortlists and job matches.</span>
      <div className="flex items-center gap-2">
        <button onClick={enable} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Enable
        </button>
        <button onClick={() => setShow(false)} aria-label="Dismiss"><X className="h-4 w-4 text-navy-400" /></button>
      </div>
    </div>
  );
}
