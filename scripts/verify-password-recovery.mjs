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
  await page.getByRole('button', { name: 'نسيت كلمة المرور؟' }).click();

  const modal = page.getByRole('dialog');
  const emailInput = page.locator('#auth-reset-email');
  const submitButton = page.getByRole('button', { name: 'إرسال رابط الاستعادة' });
  const backButton = page.getByRole('button', { name: 'العودة لتسجيل الدخول' });

  await page.screenshot({ path: `/home/ubuntu/quizspace-recovery-${viewport.width}.png`, fullPage: false });
  const initialDisabled = await submitButton.isDisabled();
  await emailInput.fill('learner@example.com');
  const validEmailEnabled = await submitButton.isEnabled();
  const noAccountEnumerationCopy = await page.getByText('لن نوضح ما إذا كان البريد مسجلاً حفاظاً على خصوصية الحسابات.').isVisible();
  const modalHeight = await modal.evaluate((node) => node.getBoundingClientRect().height);
  const inputHeight = await emailInput.evaluate((node) => node.getBoundingClientRect().height);
  const submitHeight = await submitButton.evaluate((node) => node.getBoundingClientRect().height);
  await backButton.click();
  const loginFormRestored = await page.locator('#auth-password').isVisible();

  results.push({
    viewport,
    modalVisible: await modal.isVisible(),
    modalFitsViewport: modalHeight <= viewport.height,
    initialDisabled,
    validEmailEnabled,
    noAccountEnumerationCopy,
    inputHeight,
    submitHeight,
    loginFormRestored,
    consoleErrors,
  });
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
