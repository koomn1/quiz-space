import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const indexHtml = read('index.html');
const notFoundHtml = read('public/404.html');
const shareWorker = read('share-pages/_worker.js');
const workflow = read('.github/workflows/deploy.yml');
const playwrightConfig = read('playwright.config.ts');
const qaConfig = read('qa/playwright.qa.config.ts');

const legacyAppUrl = 'https://koomn1.github.io/quiz-space/';
const primaryAppUrl = 'https://quiz-space-app.pages.dev/';

describe('primary deployment redirect contract', () => {
  it('redirects legacy GitHub Pages app traffic to the primary app while preserving route data', () => {
    expect(indexHtml).toContain("if (!/(^|\\.)github\\.io$/i.test(hostname)) return;");
    expect(indexHtml).toContain("var target = 'https://quiz-space-app.pages.dev'");
    expect(indexHtml).toContain('window.location.search + window.location.hash');
    expect(notFoundHtml).toContain("if (!/(^|\\.)github\\.io$/i.test(location.hostname)) return;");
    expect(notFoundHtml).toContain("var target = 'https://quiz-space-app.pages.dev'");
  });

  it('does not allow the share worker to preserve the legacy app base', () => {
    expect(shareWorker).toContain("return /^https:\\/\\/quiz-space-app\\.pages\\.dev(?:\\/)?$/i.test(value);");
    expect(shareWorker).not.toContain(legacyAppUrl);
    expect(shareWorker).toContain('for (const key of [\'quiz\', \'title\', \'challenge\'])');
    expect(shareWorker).toContain("const APP_FALLBACK = 'https://quiz-space-app.pages.dev';");
  });

  it('points routine E2E verification at pages.dev', () => {
    expect(workflow).toContain('PLAYWRIGHT_BASE_URL: https://quiz-space-app.pages.dev/');
    expect(playwrightConfig).toContain('https://quiz-space-app.pages.dev/');
    expect(qaConfig).toContain('https://quiz-space-app.pages.dev/');
  });
});
