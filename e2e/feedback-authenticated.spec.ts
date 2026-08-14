import { expect, test, type Page } from '@playwright/test';

const storageState = process.env.SQUADPITCH_E2E_STORAGE_STATE;
const adminStorageState = process.env.SQUADPITCH_E2E_ADMIN_STORAGE_STATE;
const workspaceId = process.env.SQUADPITCH_E2E_WORKSPACE_ID;
const configured = Boolean(storageState && workspaceId);
const base = `/workspaces/${workspaceId ?? 'fixture-required'}`;

async function completeFeedback(page: Page, message: string) {
  await page.getByRole('button', { name: 'Send feedback' }).click();
  const dialog = page.getByRole('dialog', { name: 'Send feedback' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Bug').check();
  await dialog.getByLabel(/Tell us what happened/).fill(message);
  await dialog.getByRole('button', { name: 'Send feedback' }).click();
  await expect(dialog.getByText('Thanks — your feedback was sent.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
}

test.describe('authenticated feedback flow', () => {
  test.skip(!configured, 'Set SQUADPITCH_E2E_STORAGE_STATE and SQUADPITCH_E2E_WORKSPACE_ID for the isolated Auth0 test tenant.');
  test.use({ storageState: storageState || { cookies: [], origins: [] } });

  test('desktop submits once and persists through the own-history boundary', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(base);
    const message = `E2E desktop feedback ${crypto.randomUUID()}`;
    await completeFeedback(page, message);
    const history = await page.request.get('/api/proxy/feedback/mine');
    expect(history.ok()).toBe(true);
    expect((await history.json()).items.some((item: { body: string }) => item.body === message)).toBe(true);
  });

  test('mobile More submission is reachable and viewport safe', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    await page.getByRole('navigation', { name: 'Primary workspace navigation' }).getByRole('button', { name: /More/i }).click();
    await completeFeedback(page, `E2E mobile feedback ${crypto.randomUUID()}`);
  });

  test('failure preserves the message and exposes retry without false success', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/proxy/feedback', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic unavailable' }) }));
    await page.goto(base);
    await page.getByRole('navigation', { name: 'Primary workspace navigation' }).getByRole('button', { name: /More/i }).click();
    await page.getByRole('button', { name: 'Send feedback' }).click();
    const dialog = page.getByRole('dialog', { name: 'Send feedback' });
    await dialog.getByLabel('Bug').check();
    const textarea = dialog.getByLabel(/Tell us what happened/);
    await textarea.fill('Preserve this exact message');
    await dialog.getByRole('button', { name: 'Send feedback' }).click();
    await expect(textarea).toHaveValue('Preserve this exact message');
    await expect(dialog.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(dialog.getByText('Thanks — your feedback was sent.')).toHaveCount(0);
  });

  test('ordinary user cannot enumerate the admin feedback inbox', async ({ page }) => {
    const response = await page.request.get('/api/proxy/internal/feedback');
    expect(response.status()).toBe(403);
  });
});

test.describe('admin feedback flow', () => {
  test.skip(!adminStorageState, 'Set SQUADPITCH_E2E_ADMIN_STORAGE_STATE for the isolated Auth0 admin fixture.');
  test.use({ storageState: adminStorageState || { cookies: [], origins: [] } });
  test('admin triages, notes, and resolves persisted feedback', async ({ page }) => {
    const message = `E2E admin feedback ${crypto.randomUUID()}`;
    const created = await page.request.post('/api/proxy/feedback', { data: { type: 'general', message, clientId: null, route: '/admin/feedback?secret=removed', deviceClass: 'desktop', viewport: { width: 1280, height: 800 }, idempotencyKey: crypto.randomUUID() } });
    expect(created.ok()).toBe(true);
    const id = (await created.json()).id as string;
    await page.goto('/admin/feedback');
    await expect(page.getByRole('heading', { name: 'Feedback Inbox' })).toBeVisible();
    await page.getByText(message, { exact: true }).first().click();
    const waitForPatch = () => page.waitForResponse((response) => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/api/proxy/internal/feedback/${id}`);
    let [updated] = await Promise.all([waitForPatch(), page.getByRole('button', { name: 'reviewing', exact: true }).click()]);
    expect(updated.ok()).toBe(true);
    [updated] = await Promise.all([waitForPatch(), page.getByRole('button', { name: 'high priority', exact: true }).click()]);
    expect(updated.ok()).toBe(true);
    await page.getByPlaceholder('Add internal notes about this feedback...').fill('E2E verified note');
    [updated] = await Promise.all([waitForPatch(), page.getByRole('button', { name: 'Save notes' }).click()]);
    expect(updated.ok()).toBe(true);
    [updated] = await Promise.all([waitForPatch(), page.getByRole('button', { name: 'resolved', exact: true }).click()]);
    expect(updated.ok()).toBe(true);
    await expect.poll(async () => {
      const detail = await page.request.get(`/api/proxy/internal/feedback/${id}`);
      return detail.ok() ? await detail.json() : null;
    }).toMatchObject({ id, body: message, type: 'general', route: '/admin/feedback', status: 'resolved', severity: 'high', internalNotes: 'E2E verified note' });
  });
});
