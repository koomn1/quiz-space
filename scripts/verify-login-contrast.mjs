import { chromium } from '@playwright/test';

function channel(value) {
  const numeric = Number(value) / 255;
  return numeric <= 0.03928 ? numeric / 12.92 : ((numeric + 0.055) / 1.055) ** 2.4;
}

function parseColor(value) {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  return parts.length >= 3 ? parts.slice(0, 3) : null;
}

function contrast(foreground, background) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return null;
  const relative = (rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const light = relative(fg);
  const dark = relative(bg);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('placeholder.supabase.co')) consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.addInitScript((selectedTheme) => {
    localStorage.setItem('quiz_theme', selectedTheme);
  }, theme);
  await page.goto('http://127.0.0.1:5173/quiz-space/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'التسجيل / الدخول' }).click();
  if (await page.locator('#auth-username').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /لديك حساب بالفعل/ }).click();
  }

  const dialog = page.getByRole('dialog');
  const heading = page.locator('#auth-dialog-title');
  const paragraph = dialog.locator('p').filter({ hasText: 'سجّل الدخول لمتابعة' });
  const email = page.locator('#auth-email');
  const password = page.locator('#auth-password');
  const submit = page.getByRole('button', { name: 'تسجيل الدخول' });
  await page.screenshot({ path: `/home/ubuntu/quizspace-login-${theme}.png`, fullPage: false });

  const colors = await page.evaluate(() => {
    const dialogNode = document.querySelector('[role="dialog"]');
    const headingNode = document.querySelector('#auth-dialog-title');
    const paragraphNode = document.querySelector('[role="dialog"] p');
    const emailNode = document.querySelector('#auth-email');
    const submitNode = Array.from(document.querySelectorAll('[role="dialog"] button')).find((node) => node.textContent?.includes('تسجيل الدخول'));
    const get = (node, pseudo) => node ? getComputedStyle(node, pseudo).color : '';
    const background = (node) => node ? getComputedStyle(node).backgroundColor : '';
    return {
      dialogBackground: background(dialogNode),
      headingColor: get(headingNode),
      paragraphColor: get(paragraphNode),
      emailColor: get(emailNode),
      emailBackground: background(emailNode),
      emailPlaceholder: get(emailNode, '::placeholder'),
      submitColor: get(submitNode),
      submitBackground: background(submitNode),
    };
  });
  const dimensions = await page.evaluate(() => ({
    dialogHeight: document.querySelector('[role="dialog"]')?.getBoundingClientRect().height ?? 0,
    emailHeight: document.querySelector('#auth-email')?.getBoundingClientRect().height ?? 0,
    passwordHeight: document.querySelector('#auth-password')?.getBoundingClientRect().height ?? 0,
    submitHeight: Array.from(document.querySelectorAll('[role="dialog"] button')).find((node) => node.textContent?.includes('تسجيل الدخول'))?.getBoundingClientRect().height ?? 0,
  }));

  results.push({
    theme,
    heading: await heading.textContent(),
    dialogVisible: await dialog.isVisible(),
    dialogFitsViewport: dimensions.dialogHeight <= 720,
    dimensions,
    colors,
    contrast: {
      headingOnDialog: contrast(colors.headingColor, colors.dialogBackground),
      paragraphOnDialog: contrast(colors.paragraphColor, colors.dialogBackground),
      emailOnInput: contrast(colors.emailColor, colors.emailBackground),
      placeholderOnInput: contrast(colors.emailPlaceholder, colors.emailBackground),
      submitOnButton: contrast(colors.submitColor, colors.submitBackground),
    },
    consoleErrors,
  });
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
