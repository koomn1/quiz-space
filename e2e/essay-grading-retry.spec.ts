import { expect, test } from '@playwright/test';

const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] }
  : undefined;

test.use({
  video: 'off',
  trace: 'off',
  screenshot: 'off',
  ...(launchOptions ? { launchOptions } : {}),
});

test('grades automatically, retries transient failure internally, and shows no student retry button', async ({ page }) => {
  const appUrl = (process.env.ESSAY_GRADING_UI_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  await page.goto(`${appUrl}/qa/fixtures/essay-grading-retry.html`);

  await expect(page.getByText('جارٍ تصحيح الإجابة المقالية بالذكاء الاصطناعي...')).toBeVisible();
  await expect(page.getByRole('button', { name: /إعادة محاولة التصحيح|Retry grading/ })).toHaveCount(0);
  await expect(page.getByText('قُيّمت الإجابة على أنها صحيحة')).toBeVisible();
  await expect(page.getByLabel('محاولات التصحيح الآلية')).toHaveText('2');

  await page.goto(`${appUrl}/qa/fixtures/essay-grading-retry.html?failure=1`);
  await expect(page.getByRole('alert')).toContainText('لم تُحتسب إجابتك خطأ');
  await expect(page.getByRole('button', { name: /إعادة محاولة التصحيح|Retry grading/ })).toHaveCount(0);
});
