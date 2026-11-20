import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('public/screenshots/rewards-preview');
fs.mkdirSync(screenshotDir, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'ar-EG',
  });

  await context.addInitScript(() => {
    localStorage.setItem('quiz_userId', 'user-guest-student-1');
    localStorage.setItem('quiz_isLocalSandbox', 'true');
    localStorage.setItem('quiz_userName', 'طالب كوزمو');
    localStorage.setItem('quiz_userEmail', 'student@spacequiz.local');
    localStorage.setItem('quizspace_user_coins', '350');
    localStorage.removeItem('quizspace_cosmo_tour_v1');
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  console.log('Navigating to http://localhost:5173/#/dashboard/rewards...');
  await page.goto('http://localhost:5173/#/dashboard/rewards');
  await page.waitForTimeout(3000);

  console.log('Current URL:', page.url());
  const bodyText = await page.innerText('body');
  console.log('Body Text length:', bodyText.length);
  console.log('Body snippet:', bodyText.slice(0, 300));

  const count = await page.locator('[data-testid="rewards-dashboard"]').count();
  console.log('Found [data-testid="rewards-dashboard"] count:', count);

  await page.screenshot({ path: path.join(screenshotDir, 'screen-rewards-dashboard.png'), fullPage: true });
  console.log('Screenshot saved to screen-rewards-dashboard.png');

  // Let's check if Arcade Hub trigger is there
  const arcadeBtn = page.locator('[data-testid="arcade-hub-trigger"]');
  if (await arcadeBtn.isVisible()) {
    console.log('Clicking Arcade Hub trigger...');
    await arcadeBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'screen-arcade-hub.png') });
    console.log('Screenshot saved to screen-arcade-hub.png');

    // Click Word Matrix
    const wordCard = page.locator('text=مصفوفة الكلمات').first();
    if (await wordCard.isVisible()) {
      await wordCard.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotDir, 'screen-word-matrix.png') });
      console.log('Screenshot saved to screen-word-matrix.png');
      const backBtn = page.locator('button:has-text("العودة للألعاب")').first();
      if (await backBtn.isVisible()) await backBtn.click();
    }

    // Click Spin wheel
    const wheelCard = page.locator('text=عجلة الحظ').first();
    if (await wheelCard.isVisible()) {
      await wheelCard.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotDir, 'screen-spin-wheel.png') });
      console.log('Screenshot saved to screen-spin-wheel.png');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Check Avatar store trigger
  const avatarBtn = page.locator('[data-testid="avatar-store-trigger"]');
  if (await avatarBtn.isVisible()) {
    console.log('Clicking Avatar Store trigger...');
    await avatarBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'screen-avatar-store.png') });
    console.log('Screenshot saved to screen-avatar-store.png');
  }

  await browser.close();
}

main().catch(console.error);
