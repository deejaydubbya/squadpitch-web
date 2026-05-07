import type { MetadataRoute } from 'next';

const APP_BASE_URL =
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://squadpitch.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/privacy', '/terms', '/help', '/sms-consent'],
        // Authenticated app surfaces and API routes are not for indexing.
        disallow: [
          '/auth/',
          '/api/',
          '/admin',
          '/admin/',
          '/workspaces',
          '/workspaces/',
          '/onboarding',
          '/notifications',
          '/activity',
          '/oauth/',
        ],
      },
    ],
    sitemap: `${APP_BASE_URL.replace(/\/$/, '')}/sitemap.xml`,
  };
}
