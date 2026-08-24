import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');

describe('legacy quiz share redirect contract', () => {
  it('handles both historical share route spellings', () => {
    expect(workerSource).toContain("path === '/share/quiz' || path === '/share/quiz/'");
  });

  it('redirects normal browsers to the clean GitHub Pages share URL', () => {
    expect(workerSource).toContain('function getCleanQuizShareUrl(requestUrl: URL)');
    expect(workerSource).toContain("if (!isSocialCrawler(request)) return Response.redirect(getCleanQuizShareUrl(new URL(request.url)), 301);");
    expect(workerSource).toContain("const CLEAN_SHARE_ORIGIN = 'https://quiz-space-share.pages.dev';");
    expect(workerSource).toContain('return `${CLEAN_SHARE_ORIGIN}/share/quiz?${query.toString()}`;');
  });

  it('keeps crawler-readable dynamic metadata for social previews', () => {
    expect(workerSource).toContain("if (!isSocialCrawler(request)) return Response.redirect");
    expect(workerSource).toContain('return renderQuizSharePage(request, env);');
    expect(workerSource).toContain('og:url');
    expect(workerSource).toContain('cleanShareUrl');
  });
});
