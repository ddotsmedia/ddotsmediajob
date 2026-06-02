import type { MetadataRoute } from 'next';
import { SITE } from '@ddots/shared';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — UAE Jobs`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#339a9b',
    theme_color: '#0d2e2d',
    icons: [{ src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
    categories: ['business', 'jobs'],
  };
}
