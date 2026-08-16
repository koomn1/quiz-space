import { expect, test } from '@playwright/test';

const profileId = process.env.E2E_PROFILE_ID;
const baseURL = (process.env.PLAYWRIGHT_BASE_URL || 'https://koomn1.github.io/quiz-space/').replace(/\/?$/, '/');
const assetNames = [
  'boy-robotics-transparent.webp',
  'girl-pottery-transparent.webp',
  'boy-chef-transparent.webp',
  'girl-dance-transparent.webp',
  'boy-photography-transparent.webp',
  'girl-cycling-transparent.webp',
  'nature-leaf-transparent.webp',
  'aurora-glass-transparent.webp',
  'galaxy-ring-transparent.webp',
  'cyber-orbit-transparent.webp',
  'ramadan-green-transparent.webp',
  'school-bus-transparent.webp',
  'school-stationary-transparent.webp',
  'star-crown-transparent.webp',
  'crystal-luxe-transparent.webp',
  'fire-trail-transparent.webp',
  'neon-orbit-transparent.webp',
  'royal-gold-transparent.webp',
];

async function expectLoadedImage(page: import('@playwright/test').Page, source: string) {
  const absoluteUrl = new URL(`clean-assets-replacement/${source}`, baseURL).toString();
  const imagePage = await page.context().newPage();
  try {
    const response = await imagePage.goto(absoluteUrl, { waitUntil: 'load' });
    expect(response?.ok(), `${source} should be reachable`).toBe(true);
    const contentType = response?.headers()['content-type'] || '';
    expect(contentType).toMatch(/^image\/(webp|png|jpeg)/);
    await expect.poll(() => imagePage.evaluate(() => document.images[0]?.naturalWidth || 0)).toBeGreaterThan(0);
    await expect.poll(() => imagePage.evaluate(() => document.images[0]?.naturalHeight || 0)).toBeGreaterThan(0);
  } finally {
    await imagePage.close();
  }
}

test.describe('published profile asset delivery', () => {
  test('serves every replacement avatar and frame as a loadable WebP', async ({ page }) => {
    await page.goto('/');
    for (const assetName of assetNames) {
      await expectLoadedImage(page, assetName);
    }
  });

  test('pre-caches every replacement avatar and frame in Cache Storage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return;
      await navigator.serviceWorker.ready;
    });

    const cachedPaths = await page.evaluate(async () => {
      if (!('caches' in window)) return [];
      const cache = await caches.open('quiz-space-profile-assets-v1');
      const requests = await cache.keys();
      return requests.map((request) => new URL(request.url).pathname);
    });

    expect(cachedPaths).toHaveLength(assetNames.length);
    expect(cachedPaths.every((path) => path.includes('/clean-assets-replacement/'))).toBe(true);
  });

});

test.describe('authenticated profile asset persistence', () => {
  test.skip(!profileId, 'Set E2E_PROFILE_ID and PLAYWRIGHT_STORAGE_STATE for the state-changing authenticated profile test.');

  test('renders, saves, and restores a selected avatar and frame', async ({ page }) => {
    await page.goto(`/#/profile/${profileId}`);
    await expect(page.getByRole('button', { name: 'تعديل الملف الشامل' })).toBeVisible();
    await page.getByRole('button', { name: 'تعديل الملف الشامل' }).click();

    const avatarButtons = page.getByRole('button', { name: /اختيار أفاتار/ });
    const frameButtons = page.getByRole('button', { name: /اختيار إطار/ });
    await expect(avatarButtons).toHaveCount(6);
    await expect(frameButtons.first()).toBeVisible();

    for (const image of await page.locator('img[src*="clean-assets-replacement/"]').all()) {
      await expect(image).toHaveJSProperty('complete', true);
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }

    const selectedAvatar = avatarButtons.nth(3);
    const selectedAvatarImage = selectedAvatar.locator('img');
    const selectedAvatarUrl = await selectedAvatarImage.getAttribute('src');
    expect(selectedAvatarUrl).toContain('clean-assets-replacement/');
    await selectedAvatar.click();

    const selectedFrame = frameButtons.first();
    const selectedFrameImage = selectedFrame.locator('img');
    const selectedFrameUrl = await selectedFrameImage.getAttribute('src');
    expect(selectedFrameUrl).toContain('clean-assets-replacement/');
    await selectedFrame.click();

    await page.getByRole('button', { name: 'حفظ إعدادات الملف الشامل' }).click();
    await expect(page.getByRole('button', { name: 'تعديل الملف الشامل' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'تعديل الملف الشامل' })).toBeVisible();
    await page.getByRole('button', { name: 'تعديل الملف الشامل' }).click();

    const restoredAvatar = page.getByRole('button', { name: /اختيار أفاتار/ }).nth(3);
    const restoredFrame = page.getByRole('button', { name: /اختيار إطار/ }).first();
    await expect(restoredAvatar).toHaveClass(/border-primary/);
    await expect(restoredFrame).toHaveClass(/border-primary/);
  });
});

test.describe('mobile profile picker ergonomics', () => {
  test.skip(!profileId, 'Set E2E_PROFILE_ID and PLAYWRIGHT_STORAGE_STATE for the authenticated mobile picker test.');

  test('keeps avatar and frame choices at or above the 44px touch target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#/profile/${profileId}`);
    await page.getByRole('button', { name: 'تعديل الملف الشامل' }).click();

    const avatarButtons = page.getByRole('button', { name: /اختيار أفاتار/ });
    const frameButtons = page.getByRole('button', { name: /اختيار إطار/ });
    for (const button of [avatarButtons.first(), frameButtons.first()]) {
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
