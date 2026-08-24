import { expect, test } from '@playwright/test';

const routes = [
  ['landing', '#/'],
  ['dashboard-landing', '#/dashboard/landing'],
  ['explore', '#/dashboard/explore'],
  ['categories', '#/dashboard/categories'],
  ['community', '#/dashboard/community'],
  ['leaderboard', '#/dashboard/leaderboard'],
  ['achievements', '#/dashboard/achievements'],
  ['motivation', '#/dashboard/motivation'],
  ['motivation-lucky', '#/dashboard/motivation-lucky'],
  ['motivation-brain', '#/dashboard/motivation-brain'],
  ['motivation-review', '#/dashboard/motivation-review'],
  ['motivation-season', '#/dashboard/motivation-season'],
  ['motivation-duel', '#/dashboard/motivation-duel'],
  ['motivation-store', '#/dashboard/motivation-store'],
  ['analytics', '#/dashboard/analytics'],
  ['create', '#/dashboard/create'],
  ['my-quizzes', '#/dashboard/my-quizzes'],
  ['notifications', '#/dashboard/notifications'],
  ['messages', '#/dashboard/messages'],
  ['classrooms', '#/dashboard/classrooms'],
  ['institution', '#/dashboard/institution'],
  ['bookmarks', '#/dashboard/bookmarks'],
  ['settings', '#/dashboard/settings'],
  ['support', '#/dashboard/support'],
  ['billing', '#/dashboard/billing'],
  ['aichat', '#/dashboard/aichat'],
  ['profile', '#/profile'],
  ['quiz', '#/quiz/qa-readonly'],
  ['join', '#/join/qa-readonly'],
  ['admin', '#/dashboard/admin'],
] as const;

function addIssue(list: string[], message: string) {
  if (!list.includes(message)) list.push(message);
}

function isKnownWebKitServiceWorkerIssue(message: string) {
  return /Script .*\/sw\.js load failed/.test(message);
}

test.describe('QA route compatibility and crash smoke', () => {
  for (const [name, hash] of routes) {
    test(`${name} opens without a page crash`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => {
        if (!isKnownWebKitServiceWorkerIssue(error.message)) addIssue(pageErrors, error.message);
      });
      await page.goto(`./${hash}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible();
      await page.waitForTimeout(1_500);
      expect(pageErrors, `${name} emitted browser page errors`).toEqual([]);
    });
  }
});

test.describe('responsive and accessibility smoke', () => {
  test('does not create horizontal overflow on the current device', async ({ page }) => {
    await page.goto('./#/dashboard/landing', { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => ({
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
    }));
    expect(state.scrollWidth).toBeLessThanOrEqual(state.viewport + 2);
    expect(state.viewportMeta).toContain('width=device-width');
  });

  test('interactive buttons have accessible names and touch-size targets', async ({ page }) => {
    await page.goto('./#/dashboard/landing?qa_a11y=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_500);
    const unnamed = await page.locator('button').evaluateAll((buttons) => buttons
      .filter((button) => !((button.getAttribute('aria-label') || button.textContent || '').trim()))
      .map((button) => button.outerHTML.slice(0, 180)));
    expect(unnamed).toEqual([]);
    const tooSmall = await page.locator('button').evaluateAll((buttons) => buttons
      .filter((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      })
      .map((button) => ({ text: (button.textContent || '').trim().slice(0, 80), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
    expect(tooSmall).toEqual([]);
  });
});

test.describe('performance smoke', () => {
  test('captures navigation timing, FCP/LCP and resource weight', async ({ page }, testInfo) => {
    await page.goto('./', { waitUntil: 'load' });
    await page.waitForTimeout(2_000);
    const metrics = await page.evaluate(async () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime || null;
      const lcp = await new Promise<number | null>((resolve) => {
        let latest: number | null = null;
        if (!('PerformanceObserver' in window)) return resolve(null);
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            latest = (entries[entries.length - 1] as PerformanceEntry & { startTime: number })?.startTime || latest;
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          window.setTimeout(() => { observer.disconnect(); resolve(latest); }, 250);
        } catch { resolve(null); }
      });
      return {
        domContentLoaded: navigation?.domContentLoadedEventEnd || null,
        loadEvent: navigation?.loadEventEnd || null,
        responseStart: navigation?.responseStart || null,
        fcp,
        lcp,
        resourceCount: resources.length,
        transferBytes: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
      };
    });
    testInfo.annotations.push({ type: 'performance', description: JSON.stringify(metrics) });
    console.log(`[performance:${testInfo.project.name}] ${JSON.stringify(metrics)}`);
    expect(metrics.domContentLoaded || 0).toBeLessThan(5_000);
    expect(metrics.loadEvent || 0).toBeLessThan(10_000);
    expect(metrics.resourceCount).toBeGreaterThan(0);
  });
});

test.describe('failure and recovery smoke', () => {
  test('keeps the app shell usable when API calls are offline', async ({ page }) => {
    await page.goto('./#/dashboard/community', { waitUntil: 'domcontentloaded' });
    await page.context().setOffline(true);
    await page.reload({ waitUntil: 'commit', timeout: 5_000 }).catch(() => undefined);
    await expect(page.locator('body')).toBeVisible();
    await page.context().setOffline(false);
    await page.goto('./#/dashboard/community?qa_recovery=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });
});

const hasStagingAuth = Boolean(process.env.QA_TEST_EMAIL && process.env.QA_TEST_PASSWORD && process.env.QA_TEST_COUPON);

test.describe('staging-only business journey', () => {
  test.skip(!hasStagingAuth, 'Requires QA_TEST_EMAIL, QA_TEST_PASSWORD, and QA_TEST_COUPON; never run against a real user or live payment account.');

  test('registration/login → core use → checkout/coupon → result', async ({ page }) => {
    const email = process.env.QA_TEST_EMAIL!;
    const password = process.env.QA_TEST_PASSWORD!;
    const coupon = process.env.QA_TEST_COUPON!;
    await page.goto('./', { waitUntil: 'domcontentloaded' });

    // The selectors are intentionally semantic; this test must run only with a
    // dedicated staging account and a sandbox coupon/payment provider.
    await page.getByRole('button', { name: /تسجيل|دخول|sign in|register/i }).first().click();
    await page.getByRole('textbox', { name: /email|البريد/i }).fill(email);
    await page.getByRole('textbox', { name: /password|كلمة المرور/i }).fill(password);
    await page.getByRole('button', { name: /دخول|sign in|login/i }).click();
    await expect(page.locator('body')).toBeVisible();
    await page.goto('./#/dashboard/create', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.goto(`./#/dashboard/billing?qa_coupon=${encodeURIComponent(coupon)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/error|500/i);
  });
});
