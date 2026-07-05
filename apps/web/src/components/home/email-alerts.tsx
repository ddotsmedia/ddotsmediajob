'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/trpc/react';

export function EmailAlerts() {
  const [email, setEmail] = useState('');
  const subscribe = trpc.alerts.subscribe.useMutation();

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#E5EEF0] bg-[#F7FAFC] p-8 md:flex-row">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F172A]">Never miss a job — get email alerts</h2>
          <p className="mt-1 text-sm text-[#64748B]">New UAE jobs matched to you, straight to your inbox.</p>
        </div>
        {subscribe.isSuccess ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-[#1a8a4f]">
            <CheckCircle2 className="h-5 w-5" /> Job alerts activated! Check your email.
          </p>
        ) : (
          <form
            className="flex w-full max-w-md flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) subscribe.mutate({ email: email.trim() });
            }}
          >
            <div className="flex w-full gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-12 flex-1 rounded-xl border border-[#E5EEF0] bg-white px-4 text-sm text-[#0F172A] outline-none placeholder:text-[#64748B] focus:border-[#2E8E97]"
              />
              <button
                type="submit"
                disabled={subscribe.isPending}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2E8E97] px-6 text-sm font-bold text-white hover:bg-[#26757d] disabled:opacity-60"
              >
                {subscribe.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Subscribe
              </button>
            </div>
            {subscribe.isError && <p className="text-xs text-red-600">{subscribe.error.message}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
