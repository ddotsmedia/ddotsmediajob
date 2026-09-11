'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TRPCProvider } from '@/trpc/react';
import { PwaRegister } from '@/components/pwa-register';
import { LocaleProvider } from '@/lib/i18n';
import { FeatureFlagsProvider } from '@/context/FeatureFlagsContext';
import { CopilotWidget } from '@/components/copilot-widget';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Lives here, not in layout.tsx, so the server layout stays a server
          component. <html> already has suppressHydrationWarning. */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TRPCProvider>
        <FeatureFlagsProvider>
          <LocaleProvider>{children}</LocaleProvider>
          <CopilotWidget />
        </FeatureFlagsProvider>
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </TRPCProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
