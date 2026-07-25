'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { TRPCProvider } from '@/trpc/react';
import { PwaRegister } from '@/components/pwa-register';
import { LocaleProvider } from '@/lib/i18n';
import { FeatureFlagsProvider } from '@/context/FeatureFlagsContext';
import { CopilotWidget } from '@/components/copilot-widget';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <FeatureFlagsProvider>
          <LocaleProvider>{children}</LocaleProvider>
          <CopilotWidget />
        </FeatureFlagsProvider>
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </TRPCProvider>
    </SessionProvider>
  );
}
