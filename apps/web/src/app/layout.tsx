import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Sora, DM_Sans } from 'next/font/google';
import { SITE } from '@ddots/shared';
import { Providers } from './providers';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PostJobFab } from '@/components/post-job-fab';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { AccessibilityWidget } from '@/components/accessibility-widget';
import { CompareBar } from '@/components/compare-bar';
import { InstallPrompt } from '@/components/install-prompt';
import { ErrorBoundary } from '@/components/error-boundary';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: ['UAE jobs', 'Dubai jobs', 'Abu Dhabi jobs', 'job portal UAE', 'careers UAE', 'vacancies'],
  authors: [{ name: SITE.name }],
  openGraph: {
    type: 'website',
    locale: 'en_AE',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image', title: SITE.name, description: SITE.description },
  robots: { index: true, follow: true },
  verification: { google: 'fiL1uWQdtfFe_yEmZhYLeak6z02DmgRo_FKjPcl_q3o' },
  alternates: { canonical: SITE.url },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'DdotsJobs' },
  icons: { icon: '/logo-mark.png', apple: '/logo-mark.png' },
};

export const viewport: Viewport = {
  themeColor: '#2a9aa4',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // required for env(safe-area-inset-*) on notched iPhones
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <AnnouncementBanner />
          <SiteHeader />
          <main className="flex-1 pb-16 md:pb-0"><ErrorBoundary>{children}</ErrorBoundary></main>
          <SiteFooter />
          <MobileBottomNav />
          <PostJobFab />
          <CompareBar />
          <InstallPrompt />
          <AccessibilityWidget />
        </Providers>
        {process.env.NEXT_PUBLIC_UMAMI_ID && (
          <Script
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL ?? 'https://analytics.ddotsmediajobs.com'}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
