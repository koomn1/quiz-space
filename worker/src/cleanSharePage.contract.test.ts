import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sharePageSource = readFileSync(resolve(process.cwd(), 'share-pages/_worker.js'), 'utf8');

describe('clean share page contract', () => {
  it('uses a clean pages.dev host and only allows the known app bases', () => {
    expect(sharePageSource).toContain("const SHARE_ORIGIN = 'https://quiz-space-share.pages.dev';");
    expect(sharePageSource).toContain('const SHARE_PATHS = new Set([\'/share/quiz\', \'/share/quiz/\']);');
    expect(sharePageSource).toContain('function isAllowedAppBase(value)');
    expect(sharePageSource).toContain('quiz-space-app\\.pages\\.dev');
    expect(sharePageSource).not.toContain('koomn1\\.github\\.io\\/quiz-space');
    expect(sharePageSource).toContain("return isAllowedAppBase(requested) ? requested : APP_FALLBACK;");
  });

  it('redirects human visitors to the real quiz app', () => {
    expect(sharePageSource).toContain("if (!isSocialCrawler(request)) {");
    expect(sharePageSource).toContain('return Response.redirect(getTargetAppUrl(url), 302);');
    expect(sharePageSource).toContain("return `${appBase}/#/quiz/${quizId}${challenge}`;");
  });

  it('renders quiz-specific metadata for social crawlers', () => {
    expect(sharePageSource).toContain('function renderMetadataPage(url)');
    expect(sharePageSource).toContain('const pageTitle = `${title} | Quiz Space`;');
    expect(sharePageSource).toContain('og:title');
    expect(sharePageSource).toContain('og:image');
    expect(sharePageSource).toContain('const canonical = getCleanShareUrl(url);');
  });
});
