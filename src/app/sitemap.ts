import type { MetadataRoute } from 'next';

const APP_BASE_URL = (
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://squadpitch.com'
).replace(/\/$/, '');

// Only public, indexable routes belong here. Authenticated app surfaces
// (workspaces, admin, onboarding, etc.) are blocked in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${APP_BASE_URL}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${APP_BASE_URL}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${APP_BASE_URL}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${APP_BASE_URL}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${APP_BASE_URL}/data-deletion`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${APP_BASE_URL}/help`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${APP_BASE_URL}/sms-consent`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];
}
