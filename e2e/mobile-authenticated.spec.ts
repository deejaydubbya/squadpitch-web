import { test, expect, type Page } from '@playwright/test';

const storageState = process.env.SQUADPITCH_E2E_STORAGE_STATE;
const workspaceId = process.env.SQUADPITCH_E2E_WORKSPACE_ID;
const configured = Boolean(storageState && workspaceId);
const base = `/workspaces/${workspaceId ?? 'fixture-required'}`;

test.use({
  storageState: storageState || { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
});

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow, 'page must not overflow the mobile viewport').toEqual({ document: 0, body: 0 });
}

async function expectAuthenticatedPage(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'networkidle' });
  expect(response?.status(), `${path} should render`).toBeLessThan(400);
  expect(page.url(), `${path} must retain the real authenticated session`).not.toContain('/auth/login');
  await expectNoHorizontalOverflow(page);
}

test.describe('authenticated mobile regression', () => {
  test.skip(!configured, 'Set SQUADPITCH_E2E_STORAGE_STATE and SQUADPITCH_E2E_WORKSPACE_ID for an isolated test tenant.');

  test('onboarding remains keyboard and viewport safe', async ({ page }) => {
    await expectAuthenticatedPage(page, '/onboarding');
    await expect(page.getByRole('progressbar', { name: 'Onboarding progress' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Create your first ready-to-post campaign/i })).toBeVisible();
  });

  test('bottom navigation reaches Home, Quick Create, Posts, and back', async ({ page }) => {
    await expectAuthenticatedPage(page, base);
    const navigation = page.getByRole('navigation', { name: 'Primary workspace navigation' });
    await expect(navigation).toBeVisible();

    await navigation.getByRole('link', { name: /Create/i }).click();
    await expect(page).toHaveURL(new RegExp(`${base}/create`));
    await expect(page.getByText('Quick Create', { exact: true })).toBeVisible();

    await navigation.getByRole('link', { name: /Posts/i }).click();
    await expect(page).toHaveURL(new RegExp(`${base}/planner`));
    await expect(page.getByText('Agenda', { exact: true })).toBeVisible();

    await navigation.getByRole('link', { name: /Home/i }).click();
    await expect(page).toHaveURL(new RegExp(`${base}/?$`));
  });

  test('advanced campaign entry is clearly desktop recommended', async ({ page }) => {
    await expectAuthenticatedPage(page, `${base}/create`);
    await expect(page.getByText('Quick Create', { exact: true })).toBeVisible();
    await expect(page.getByText('Desktop recommended', { exact: true })).toBeVisible();
  });

  test('More exposes workspace switching, notifications, inventory, and settings', async ({ page }) => {
    await expectAuthenticatedPage(page, base);
    const navigation = page.getByRole('navigation', { name: 'Primary workspace navigation' });
    await navigation.getByRole('button', { name: /More/i }).click();

    const drawer = page.getByRole('dialog', { name: 'Workspace navigation' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: /Switch workspace/i })).toHaveAttribute('href', '/workspaces');
    await expect(drawer.getByRole('link', { name: /Notifications/i })).toHaveAttribute('href', '/notifications');
    await expect(drawer.getByRole('link', { name: /Properties|Vehicles|Inventory & data/i })).toHaveAttribute('href', `${base}/data`);
    await expect(drawer.getByRole('link', { name: /Workspace settings/i })).toHaveAttribute('href', `${base}/settings`);
    await expect(drawer.getByRole('link', { name: 'Channels', exact: true })).toHaveAttribute('href', `${base}/settings/channels`);
    await expect(drawer.getByRole('link', { name: 'Integrations', exact: true })).toHaveCount(0);
  });

  test('Inbox supports list to thread to browser back when a seeded lead exists', async ({ page }) => {
    await expectAuthenticatedPage(page, `${base}/inbox`);
    const search = page.getByRole('textbox', { name: 'Search conversations' });
    await expect(search).toBeVisible();

    const firstConversation = page.locator('ul > li > button').first();
    if (await firstConversation.count()) {
      await firstConversation.click();
      await expect(page).toHaveURL(/[?&]c=/);
      await page.goBack();
      await expect(search).toBeVisible();
    } else {
      await expect(page.getByText(/No leads yet|No conversations/i)).toBeVisible();
    }
  });

  test('notifications and planner agenda render their safe empty or populated states', async ({ page }) => {
    await expectAuthenticatedPage(page, '/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();

    await expectAuthenticatedPage(page, `${base}/planner`);
    await expect(page.getByText('Agenda', { exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Post agenda"], :text("No posts in this agenda.")').first()).toBeVisible();
  });
});
