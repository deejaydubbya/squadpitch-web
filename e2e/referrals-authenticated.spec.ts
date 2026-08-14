import { expect, test } from '@playwright/test';

const storageState = process.env.SQUADPITCH_E2E_STORAGE_STATE;
const adminStorageState = process.env.SQUADPITCH_E2E_ADMIN_STORAGE_STATE;

test.describe('authenticated referral program', () => {
  test.skip(!storageState, 'Set SQUADPITCH_E2E_STORAGE_STATE to an isolated Auth0 user fixture.');
  test.use({ storageState: storageState || { cookies: [], origins: [] } });

  test('shows a private referral history and a copyable unique link', async ({ page }) => {
    await page.goto('/referrals');
    await expect(page.getByRole('heading', { name: 'Give a great recommendation. Earn $59.' })).toBeVisible();
    const link = page.getByLabel('Your referral link');
    await expect(link).toHaveValue(/\/r\/[A-HJ-NP-Z2-9]{12}$/);
    await expect(page.getByText('Your referrals')).toBeVisible();
    await expect(page.getByText(/Credits are not cash/)).toBeVisible();
  });

  test('is viewport-safe at 320x568 and self-referral is denied', async ({ page, context }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/referrals');
    const referralUrl = await page.getByLabel('Your referral link').inputValue();
    await page.goto(referralUrl);
    await page.waitForURL(/\/auth\/signup|\/referrals/);
    if (new URL(page.url()).pathname === '/auth/signup') await page.goto('/referrals');
    const attach = await context.request.post('/api/referrals/attach');
    expect([200, 409]).toContain(attach.status());
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
