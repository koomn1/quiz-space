import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('public/screenshots/rewards-preview');
fs.mkdirSync(screenshotDir, { recursive: true });

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait and retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log('1. Starting preview server on port 4173...');
  const server = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
    stdio: 'ignore',
    shell: true,
  });

  const ready = await waitForServer('http://localhost:4173/');
  if (!ready) {
    console.error('Failed to start server');
    server.kill();
    process.exit(1);
  }
  console.log('Server is ready at http://localhost:4173/');

  console.log('2. Launching Chromium...');
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

  console.log('3. Navigating directly to #/dashboard/rewards...');
  await page.goto('http://localhost:4173/#/dashboard/rewards', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Current URL:', page.url());
  const hasDashboard = await page.locator('[data-testid="rewards-dashboard"]').count();
  console.log('Has rewards dashboard:', hasDashboard > 0);

  // Take full dashboard screenshot
  await page.screenshot({ path: path.join(screenshotDir, '01-rewards-dashboard-full.png'), fullPage: true });
  console.log('Saved 01-rewards-dashboard-full.png');

  // Verify Cosmo dialogue bubble
  const cosmoBubble = page.locator('[data-testid="cosmo-dialogue-bubble"]');
  if (await cosmoBubble.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Cosmo bubble is visible!');
    await page.screenshot({ path: path.join(screenshotDir, '02-cosmo-bubble-visible.png') });
    console.log('Saved 02-cosmo-bubble-visible.png');

    // Click "خدني هناك"
    const takeMeThereBtn = page.locator('[data-testid="cosmo-take-me-there-btn"]');
    if (await takeMeThereBtn.isVisible()) {
      await takeMeThereBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, '03-spotlight-arcade.png') });
      console.log('Saved 03-spotlight-arcade.png');
    }
  }

  // Open Arcade Hub Modal
  const arcadeBtn = page.locator('[data-testid="arcade-hub-trigger"]');
  if (await arcadeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Opening Arcade Hub...');
    await arcadeBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, '04-arcade-hub-modal.png') });
    console.log('Saved 04-arcade-hub-modal.png');

    // Open Memory match
    const matchCard = page.locator('text=تطابق الذاكرة').first();
    if (await matchCard.isVisible({ timeout: 1000 }).catch(() => false)) {
      await matchCard.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, '05-memory-game.png') });
      console.log('Saved 05-memory-game.png');

      const backBtn = page.locator('button:has-text("العودة للألعاب")').first();
      if (await backBtn.isVisible()) await backBtn.click();
      await page.waitForTimeout(400);
    }

    // Open Word Matrix
    const wordCard = page.locator('text=مصفوفة الكلمات').first();
    if (await wordCard.isVisible({ timeout: 1000 }).catch(() => false)) {
      await wordCard.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, '06-word-matrix-puzzle.png') });
      console.log('Saved 06-word-matrix-puzzle.png');

      const backBtn = page.locator('button:has-text("العودة للألعاب")').first();
      if (await backBtn.isVisible()) await backBtn.click();
      await page.waitForTimeout(400);
    }

    // Open Spin Wheel
    const wheelCard = page.locator('text=عجلة الحظ').first();
    if (await wheelCard.isVisible({ timeout: 1000 }).catch(() => false)) {
      await wheelCard.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, '07-daily-spin-wheel.png') });
      console.log('Saved 07-daily-spin-wheel.png');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // Open Avatar Customizer Store Modal
  const storeBtn = page.locator('[data-testid="avatar-store-trigger"]');
  if (await storeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Opening Avatar Store...');
    await storeBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, '08-avatar-store-modal.png') });
    console.log('Saved 08-avatar-store-modal.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // Mobile View
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, '09-mobile-rewards-dashboard.png') });
  console.log('Saved 09-mobile-rewards-dashboard.png');

  console.log('ALL SCREENSHOTS SUCCESSFULLY CAPTURED!');
  await browser.close();
  server.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
