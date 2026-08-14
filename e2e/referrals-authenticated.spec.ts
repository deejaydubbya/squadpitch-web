import { expect, test } from '@playwright/test';

const storageState = process.env.SQUADPITCH_E2E_STORAGE_STATE;
const adminStorageState = process.env.SQUADPITCH_E2E_ADMIN_STORAGE_STATE;

test.describe('authenticated referral program', () => {
  test.skip(!storageState, 'Set SQUADPITCH_E2E_STORAGE_STATE to an isolated Auth0 user fixture.');
  test.use({ storageState: storageState || { cookies: [], origins: [] } });

  test('shows a private referral history and a copyable unique link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://app.squadpitch.com' });
    await page.goto('/referrals');
    await expect(page.getByRole('heading', { name: 'Give a great recommendation. Earn $59.' })).toBeVisible();
    const link = page.getByLabel('Your referral link');
    await expect(link).toHaveValue(/\/r\/[A-HJ-NP-Z2-9]{12}$/);
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    await expect(page.getByText('Your referrals')).toBeVisible();
    await expect(page.getByText(/Credits are not cash/)).toBeVisible();
  });

  test('is viewport-safe at 320x568 and self-referral is denied', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/referrals');
    const referralUrl = await page.getByLabel('Your referral link').inputValue();
    const capture = await page.request.get(referralUrl, { maxRedirects: 0 });
    expect(capture.status()).toBe(307);
    const attach = await page.request.post('/api/referrals/attach');
    expect(attach.status()).toBe(409);
    await expect(attach.json()).resolves.toMatchObject({ error: 'SELF_REFERRAL' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});

test.describe('admin referral program', () => {
  test.skip(!adminStorageState, 'Set SQUADPITCH_E2E_ADMIN_STORAGE_STATE to an isolated Auth0 admin fixture.');
  test.use({ storageState: adminStorageState || { cookies: [], origins: [] } });

  test('admin can inspect referral operations', async ({ page }) => {
    await page.goto('/admin/referrals');
    await expect(page.getByRole('heading', { name: 'Referrals', exact: true })).toBeVisible();
  });
});
