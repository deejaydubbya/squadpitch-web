import { expect, test } from '@playwright/test';

const excludedState = process.env.SQUADPITCH_E2E_STORAGE_STATE;
const eligibleState = process.env.SQUADPITCH_TRIAL_E2E_STORAGE_STATE;
const workspaceId = process.env.SQUADPITCH_E2E_WORKSPACE_ID;

test.describe('free trial production safety', () => {
  test.skip(!excludedState, 'Set the standard synthetic Auth0 storage state.');
  test.use({ storageState: excludedState || { cookies: [], origins: [] } });

  test('synthetic fixture cannot consume a promotional trial', async ({ page }) => {
    const summary = await page.request.get('/api/proxy/billing/trial');
    expect(summary.ok()).toBe(true);
    await expect(summary.json()).resolves.toMatchObject({ eligible: false, active: false });
    const start = await page.request.post('/api/proxy/billing/trial/start');
    expect(start.status()).toBe(403);
  });
});

test.describe('eligible free trial offer', () => {
  test.skip(!eligibleState || !workspaceId, 'Set a new ordinary Auth0 state and its isolated workspace ID.');
  test.use({ storageState: eligibleState || { cookies: [], origins: [] } });

  test('eligible account sees honest mobile-safe trial offer without activating it', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`/workspaces/${workspaceId}/settings/billing`);
    await expect(page.getByRole('region', { name: 'Free trial offer' })).toContainText('No card required and no charge today');
    await expect(page.getByRole('button', { name: 'Start 14-day Pro trial' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});
