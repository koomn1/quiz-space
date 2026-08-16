import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 720 }]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('http://127.0.0.1:5173/quiz-space/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'التسجيل / الدخول' }).click();
  if (await page.locator('#auth-username').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /لديك حساب بالفعل/ }).click();
  }

  const modal = page.getByRole('dialog');
  const loginButton = page.getByRole('button', { name: 'تسجيل الدخول', exact: true });
  const googleButton = page.getByRole('button', { name: 'المتابعة باستخدام Google' });
  const closeButton = page.getByRole('button', { name: 'إغلاق', exact: true });
  const switchToRegister = page.getByRole('button', { name: /مستخدم جديد/ });

  await page.screenshot({ path: `/home/ubuntu/quizspace-auth-${viewport.width}.png`, fullPage: false });
  const loginModeVisible = await loginButton.isVisible();
  await switchToRegister.click();
  const registerModeVisible = await page.locator('#auth-username').isVisible();
  await page.getByRole('button', { name: /لديك حساب بالفعل/ }).click();

  results.push({
    viewport,
    modalVisible: await modal.isVisible(),
    modalFitsViewport: await modal.evaluate((node) => node.getBoundingClientRect().height <= window.innerHeight),
    loginModeVisible,
    registerModeVisible,
    loginButtonHeight: await loginButton.evaluate((node) => node.getBoundingClientRect().height),
    googleButtonHeight: await googleButton.evaluate((node) => node.getBoundingClientRect().height),
    closeButtonSize: await closeButton.evaluate((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })),
    overflowY: await modal.evaluate((node) => getComputedStyle(node).overflowY),
    consoleErrors,
  });
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
