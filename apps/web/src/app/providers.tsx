'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { TRPCProvider } from '@/trpc/react';
import { PwaRegister } from '@/components/pwa-register';
import { LocaleProvider } from '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <LocaleProvider>{children}</LocaleProvider>
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </TRPCProvider>
    </SessionProvider>
  );
}
