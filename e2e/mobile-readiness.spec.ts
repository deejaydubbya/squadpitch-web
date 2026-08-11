import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'narrow phone', width: 320, height: 568 },
  { name: 'phone 375', width: 375, height: 667 },
  { name: 'phone 390', width: 390, height: 844 },
  { name: 'large phone', width: 430, height: 932 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`public entry is usable without overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(400);

    await expect(page.getByRole('heading', { name: /Turn any listing/i })).toBeVisible();
    const cta = page.getByRole('link', { name: /^Start Free$/i }).first();
    await expect(cta).toBeVisible();

    const box = await cta.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(1);
    expect(overflow.body).toBeLessThanOrEqual(1);
  });
}

test('PWA manifest and mobile metadata are emitted in production', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0F0C1A');

  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/manifest+json');
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: 'Squadpitch',
    short_name: 'Squadpitch',
    display: 'standalone',
    start_url: '/workspaces',
  });
});
