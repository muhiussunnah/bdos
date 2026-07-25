import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Client Acquisition OS`,
    short_name: BRAND.name,
    description: 'Find, win and keep clients on autopilot — AI lead discovery, outreach, follow-ups and inbox intelligence in one console.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0710',
    theme_color: '#0B0710',
    categories: ['business', 'productivity', 'marketing'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
