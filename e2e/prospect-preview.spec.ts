import { expect, test } from '@playwright/test';

const viewports = [
  { name: '320', width: 320, height: 568 },
  { name: '375', width: 375, height: 667 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const viewport of viewports) {
  test(`prospect preview is responsive at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('https://images.example/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#315b52"/></svg>' }));
    await page.route('**/api/public/prospects/preview/**', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ businessName: 'Synthetic Canary Realty', prospectName: 'Jane', logoUrl: null, brand: { description: 'A trusted local real-estate team.', website: null, city: 'Austin', state: 'TX' }, items: [{ id: 'item', type: 'PROPERTY', title: '123 Main Street', summary: 'A controlled synthetic listing fixture.', imageUrl: null }], drafts: [{ id: 'draft', channel: 'FACEBOOK', body: '🏡 Exact opener\n\n123 Main Street\n\n#AustinHomes', mediaUrl: 'https://images.example/one.jpg', media: [{ url: 'https://images.example/one.jpg', thumbnailUrl: null, assetType: 'image', orderIndex: 0 }, { url: 'https://images.example/two.jpg', thumbnailUrl: null, assetType: 'image', orderIndex: 1 }, { url: 'https://images.example/three.jpg', thumbnailUrl: null, assetType: 'image', orderIndex: 2 }] }], claimAvailable: true, claimStatus: 'CLAIMABLE', preparationState: 'SELECTED' }),
    }));
    await page.goto('/preview/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA#claim=BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    await expect(page.getByRole('heading', { name: /Synthetic Canary Realty/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Claim this workspace' })).toBeVisible();
    await expect(page.getByText('🏡 Exact opener')).toBeVisible();
    await expect(page.getByText('1 / 3')).toBeVisible();
    await page.getByRole('button', { name: 'Show next image' }).click();
    await expect(page.getByText('2 / 3')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
}
