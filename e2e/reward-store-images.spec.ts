import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const configuredStorageState = process.env.PLAYWRIGHT_STORAGE_STATE;
const hasUsableStorageState = Boolean(configuredStorageState && fs.existsSync(configuredStorageState));
const animatedFramePaths = [
  'images/animated-frames/frame-aurora.gif',
  'images/animated-frames/frame-crystal-luxe.gif',
  'images/animated-frames/frame-fire.gif',
  'images/animated-frames/frame-galaxy.gif',
  'images/animated-frames/frame-nature-leaf.gif',
  'images/animated-frames/frame-neon-orbit.gif',
  'images/animated-frames/frame-royal-gold.gif',
  'images/animated-frames/frame-school-bus.gif',
  'images/animated-frames/frame-star-crown.gif',
];

async function expectLoadedImage(image: import('@playwright/test').Locator) {
  await expect(image).toHaveAttribute('src', /.+/);
  await expect.poll(
    () => image.evaluate((element) => ({
      complete: (element as HTMLImageElement).complete,
      naturalWidth: (element as HTMLImageElement).naturalWidth,
      naturalHeight: (element as HTMLImageElement).naturalHeight,
    })),
    { timeout: 15_000 },
  ).toMatchObject({ complete: true, naturalWidth: expect.any(Number), naturalHeight: expect.any(Number) });

  const dimensions = await image.evaluate((element) => ({
    naturalWidth: (element as HTMLImageElement).naturalWidth,
    naturalHeight: (element as HTMLImageElement).naturalHeight,
  }));
  expect(dimensions.naturalWidth).toBeGreaterThan(0);
  expect(dimensions.naturalHeight).toBeGreaterThan(0);
}

test.describe('reward store image delivery', () => {
  test('serves every animated reward frame as a loadable GIF', async ({ page, baseURL }) => {
    await page.goto('./');

    for (const assetPath of animatedFramePaths) {
      const response = await page.request.get(new URL(assetPath, baseURL).toString(), { timeout: 15_000 });
      expect(response.ok(), `${assetPath} should be reachable`).toBe(true);
      expect(response.headers()['content-type'] || '').toMatch(/^image\/gif/);
      expect((await response.body()).byteLength, `${assetPath} should not be empty`).toBeGreaterThan(100);
    }
  });
});

test.describe('authenticated reward store cards', () => {
  test.skip(!hasUsableStorageState, 'Set PLAYWRIGHT_STORAGE_STATE to a dedicated test account state.');

  test('never renders a visible store card without a loaded product image', async ({ page }) => {
    await page.goto('./#/motivation-store', { waitUntil: 'domcontentloaded' });

    const cards = page.getByTestId('store-item-card');
    await expect.poll(() => cards.count(), { timeout: 30_000 }).toBeGreaterThan(0);

    for (let index = 0; index < await cards.count(); index += 1) {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded();
      const images = card.locator('img');
      await expect(images).toHaveCount(1);
      await expectLoadedImage(images.first());
    }
  });
});
