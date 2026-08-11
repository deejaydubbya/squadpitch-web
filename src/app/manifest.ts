import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Squadpitch',
    short_name: 'Squadpitch',
    description: 'AI-powered social media content studio',
    start_url: '/workspaces',
    scope: '/',
    display: 'standalone',
    background_color: '#0F0C1A',
    theme_color: '#0F0C1A',
    orientation: 'any',
    categories: ['business', 'productivity', 'social'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
