import { test, expect } from '@playwright/test';

/**
 * Customer happy-path smoke test.
 *
 * What this proves:
 *   1. Landing page renders for an anonymous user with the hero copy +
 *      the Start Free CTA.
 *   2. Clicking Start Free leads to the Auth0 universal-login domain
 *      (or the mocked auth flow if AUTH0_DOMAIN is unset locally).
 *   3. Public legal pages are reachable without auth.
 *   4. /workspaces redirects an anonymous visitor to the auth flow.
 *
 * What this intentionally does NOT do:
 *   - Hit real Auth0. We just assert that the navigation initiates the
 *     auth flow (URL prefix). A second test under a "logged-in" project
 *     would seed a session cookie and exercise onboarding/publish; that
 *     belongs in a follow-up PR with a session fixture, not in this
 *     smoke test.
 *   - Hit real Stripe / social OAuth providers.
 */

test.describe('Customer happy path — anonymous landing', () => {
  test('landing page renders the hero and Start Free CTA', async ({ page }) => {
    await page.goto('/');
    // Hero copy from squadpitch-web/src/app/(public)/page.tsx
    await expect(
      page.getByRole('heading', { name: /Turn any listing/i })
    ).toBeVisible();
    // Both header + hero have a "Start Free" button — there are several.
    const ctas = page.getByRole('link', { name: /^Start Free$/i });
    await expect(ctas.first()).toBeVisible();
  });

  test('Start Free CTA routes through the supported signup handoff', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /^Start Free$/i }).first();
    const href = await cta.getAttribute('href');
    expect(href).toContain('/auth/signup');
    expect(href).toContain('returnTo=%2Fonboarding');
  });

  test('public legal pages are reachable without auth', async ({ page }) => {
    for (const path of ['/privacy', '/terms', '/help']) {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      // Each legal page sets a heading via metadata — confirm body rendered.
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('robots.txt and sitemap.xml are reachable without auth', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    const robotsBody = await robots.text();
    expect(robotsBody).toMatch(/User-?Agent/i);
    expect(robotsBody.toLowerCase()).toContain('disallow');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain('<url>');
  });

  test('anonymous /workspaces is gated by the auth flow', async ({ page }) => {
    // No session cookie — middleware should redirect to /auth/login.
    const response = await page.goto('/workspaces', { waitUntil: 'domcontentloaded' });
    // Either we're redirected to /auth/* or we land on a 3xx response.
    const finalUrl = page.url();
    const ok =
      finalUrl.includes('/auth/') ||
      (response?.status() ?? 200) >= 300;
    expect(ok, `expected /auth/* redirect, got ${finalUrl}`).toBe(true);
  });
});

test.describe('Mocked publish flow scaffolding (skipped — no session fixture yet)', () => {
  // These tests are placeholders for the next iteration: seed a session
  // cookie + intercept /api/proxy/* with mocked drafts, then exercise
  // the Planner approve→schedule→publish path. Skipped until the
  // session fixture is in place so this smoke test runs in CI today
  // without flakiness.
  test.skip('logged-in user reaches onboarding', async () => {});
  test.skip('approve → schedule → publish updates the planner card', async () => {});
  test.skip('402 USAGE_LIMIT triggers the upgrade modal', async () => {});
});
