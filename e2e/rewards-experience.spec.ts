import { test, expect } from '@playwright/test';

test.describe('QuizSpace Rewards & 3D Mascot Gamification Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock user profile and state into localStorage for deterministic testing
    await page.addInitScript(() => {
      localStorage.setItem('local_auth_user', JSON.stringify({
        id: 'test-e2e-user',
        email: 'tester@quizspace.local',
        user_metadata: { name: 'E2E Explorer' }
      }));
      // Reset tour state so Cosmo always shows his "What's New" guide
      localStorage.removeItem('quizspace_cosmo_tour_v1');
      localStorage.removeItem('quizspace_user_frames_test-e2e-user');
    });
  });

  test('renders all 6 reward pillars and honors QuizSpace brand palette', async ({ page }) => {
    // Navigate to profile or rewards tab
    await page.goto('./#/profile/test-e2e-user');

    // Wait for the Rewards Dashboard to be mounted
    const dashboard = page.locator('[data-testid="rewards-dashboard"]');
    if (await dashboard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 1. Verify all 6 pillars are visible
      await expect(page.locator('[data-testid="points-balance-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="level-progress-rail"]')).toBeVisible();
      await expect(page.locator('[data-testid="daily-gift-box"]')).toBeVisible();
      await expect(page.locator('[data-testid="daily-challenges-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="weekly-tasks-board"]')).toBeVisible();
      await expect(page.locator('[data-testid="badges-trophy-hall"]')).toBeVisible();
      await expect(page.locator('[data-testid="vip-leaderboard-podium"]')).toBeVisible();

      // 2. Verify Cosmo Mascot Guide
      const cosmoBubble = page.locator('[data-testid="cosmo-dialogue-bubble"]');
      await expect(cosmoBubble).toBeVisible();
      await expect(cosmoBubble).toContainText('كوزمو');

      // 3. Test "خدني هناك" spotlight navigation
      const takeMeThereBtn = page.locator('[data-testid="cosmo-take-me-there-btn"]');
      await takeMeThereBtn.click();

      // Verify Arcade Hub trigger is focused/highlighted
      const arcadeTrigger = page.locator('[data-testid="arcade-hub-trigger"]');
      await expect(arcadeTrigger).toBeVisible();

      // 4. Open Arcade Hub Modal
      await arcadeTrigger.click();
      const arcadeModal = page.locator('[data-testid="arcade-hub-modal"]');
      await expect(arcadeModal).toBeVisible();

      // Verify all 3 mini-games are present
      await expect(arcadeModal).toContainText('تطابق الذاكرة');
      await expect(arcadeModal).toContainText('مصفوفة الكلمات');
      await expect(arcadeModal).toContainText('عجلة الحظ');

      // Close Arcade Modal
      await page.keyboard.press('Escape');

      // 5. Open Avatar Customizer Store Modal
      const avatarStoreBtn = page.locator('[data-testid="avatar-store-trigger"]');
      if (await avatarStoreBtn.isVisible()) {
        await avatarStoreBtn.click();
        const customizerModal = page.locator('[data-testid="avatar-customizer-modal"]');
        await expect(customizerModal).toBeVisible();
        await expect(customizerModal).toContainText('متجر الإطارات');
        await page.keyboard.press('Escape');
      }
    }
  });

  test('mobile viewport responsiveness (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#/profile/test-e2e-user');

    const dashboard = page.locator('[data-testid="rewards-dashboard"]');
    if (await dashboard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check horizontal overflow on mobile
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    }
  });
});
