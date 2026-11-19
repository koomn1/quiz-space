import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const artifactDir = 'C:/Users/RDP/.gemini/antigravity/brain/1f623a32-3416-41a2-834a-09d653ec988e';
const screenshotDir = path.join(artifactDir, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function captureMode(mode, namePrefix) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  await page.addInitScript((m) => {
    localStorage.setItem('quiz_theme', m);
    localStorage.setItem('quiz_theme_preference', m);
  }, mode);

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Apply theme class
  await page.evaluate((m) => {
    if (m === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.theme = 'light';
    }
  }, mode);
  await page.waitForTimeout(400);

  // 1. Guest Landing
  console.log(`[${mode}] Capturing Guest Landing...`);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_01_guest_landing.png`) });

  // 2. Open Explore
  console.log(`[${mode}] Navigating to Explore...`);
  const exploreBtn = page.locator('button:has-text("استكشف الاختبارات")').first();
  if (await exploreBtn.isVisible()) {
    await exploreBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_02_explore.png`) });
  }

  // 3. Open Auth Modal
  console.log(`[${mode}] Opening Auth Modal...`);
  const loginBtn = page.locator('button:has-text("تسجيل الدخول")').first();
  if (await loginBtn.isVisible()) {
    await loginBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_03_auth_modal.png`) });
    
    // Close modal
    const closeBtn = page.locator('button[aria-label="إغلاق"], button[aria-label="Close"], button:has-text("✕")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // 4. Open Menu / CardNav
  console.log(`[${mode}] Opening Header Menu...`);
  const menuBtn = page.locator('button:has-text("القائمة"), button:has-text("Menu")').first();
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_04_menu_open.png`) });
    await menuBtn.click();
    await page.waitForTimeout(400);
  }

  // 5. Navigate to Create Studio
  console.log(`[${mode}] Navigating to Create Studio...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/create'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_05_create_studio.png`) });

  // 6. Navigate to My Quizzes
  console.log(`[${mode}] Navigating to My Quizzes...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/my-quizzes'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_06_my_quizzes.png`) });

  // 7. Navigate to Store
  console.log(`[${mode}] Navigating to Store...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/store'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_07_store.png`) });

  // 8. Navigate to Billing
  console.log(`[${mode}] Navigating to Billing...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/billing'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_08_billing.png`) });

  // 9. Navigate to Classrooms
  console.log(`[${mode}] Navigating to Classrooms...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/classrooms'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_09_classrooms.png`) });

  // 10. Navigate to Community
  console.log(`[${mode}] Navigating to Community...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/community'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_10_community.png`) });

  // 11. Settings
  console.log(`[${mode}] Navigating to Settings...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/settings'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_11_settings.png`) });

  // 12. Leaderboard
  console.log(`[${mode}] Navigating to Leaderboard...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/leaderboard'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_12_leaderboard.png`) });

  // 13. Achievements
  console.log(`[${mode}] Navigating to Achievements...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/achievements'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_13_achievements.png`) });

  // 14. Bookmarks
  console.log(`[${mode}] Navigating to Bookmarks...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/bookmarks'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_14_bookmarks.png`) });

  // 15. Customization
  console.log(`[${mode}] Navigating to Customization...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/customization'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_15_customization.png`) });

  // 16. Support
  console.log(`[${mode}] Navigating to Support...`);
  await page.evaluate(() => { window.location.hash = '#/dashboard/support'; });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_16_support.png`) });

  // 17. Quiz Resolver
  console.log(`[${mode}] Navigating to Quiz Resolver...`);
  await page.evaluate(() => { window.location.hash = '#/quiz/quiz-ai-intro'; });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(screenshotDir, `${namePrefix}_17_quiz_resolver.png`) });

  await browser.close();
}

async function run() {
  console.log('=== Capturing FULL LIGHT MODE Suite ===');
  await captureMode('light', 'light');
  console.log('=== Capturing FULL DARK MODE Suite ===');
  await captureMode('dark', 'dark');
  console.log('=== All 17 pages captured in both modes! ===');
}

run().catch(console.error);
