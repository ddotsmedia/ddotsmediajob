import type { MetadataRoute } from 'next';
import { SITE } from '@ddots/shared';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — UAE Jobs`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'en',
    background_color: '#0f172a',
    theme_color: '#2a9aa4',
    icons: [
      { src: '/logo-mark.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/logo-mark.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Browse Jobs', short_name: 'Jobs', url: '/jobs' },
      { name: 'Post a Job', short_name: 'Post Job', url: '/employer/post' },
      { name: 'WhatsApp Groups', short_name: 'WA Groups', url: '/whatsapp-groups' },
      { name: 'My Dashboard', short_name: 'Dashboard', url: '/dashboard' },
    ],
    categories: ['business', 'jobs'],
    // Android share-target: share a WhatsApp message → Quick Import.
    share_target: {
      action: '/admin/quick-import',
      method: 'GET',
      params: { text: 'text', title: 'title' },
    },
  } as MetadataRoute.Manifest;
}
