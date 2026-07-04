'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import type { SocialProvider } from '@ddots/auth';

type Enabled = Record<SocialProvider, boolean>;

const ORDER: SocialProvider[] = ['google', 'facebook', 'linkedin', 'twitter'];

const STYLE: Record<SocialProvider, string> = {
  google: 'border border-navy-200 bg-white text-navy-800 hover:bg-navy-50',
  facebook: 'bg-[#1877f2] text-white hover:bg-[#1568d8]',
  linkedin: 'bg-[#0077b5] text-white hover:bg-[#00669c]',
  twitter: 'bg-black text-white hover:bg-neutral-800',
};

const LABEL: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'X',
};

export function SocialAuthButtons({ enabled, defaultCallback = '/dashboard' }: { enabled: Enabled; defaultCallback?: string }) {
  const params = useSearchParams();
  const raw = params.get('callbackUrl');
  // Open-redirect guard: same-origin relative paths only.
  const callbackUrl = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : defaultCallback;

  const active = ORDER.filter((p) => enabled[p]);
  if (active.length === 0) return null;

  return (
    <div className="mt-6">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(active.length, 4)}, minmax(0, 1fr))` }}
      >
        {active.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => signIn(p, { callbackUrl })}
            aria-label={`Continue with ${LABEL[p]}`}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors ${STYLE[p]}`}
          >
            <ProviderIcon provider={p} />
            <span className="hidden sm:inline">{LABEL[p]}</span>
          </button>
        ))}
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-navy-700/50">
        <span className="h-px flex-1 bg-navy-100" /> or continue with email <span className="h-px flex-1 bg-navy-100" />
      </div>
    </div>
  );
}

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  const c = 'h-[18px] w-[18px]';
  switch (provider) {
    case 'google':
      return (
        <svg viewBox="0 0 24 24" className={c} aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden>
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.68 4.53-4.68 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.24h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden>
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden>
          <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.29L17.61 20.65Z" />
        </svg>
      );
  }
}
