import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const shareModal = read('src/components/ShareModal.tsx');
const motivationHub = read('src/components/MotivationHub.tsx');
const siteHtml = read('index.html');
const quizHtml = read('public/share/quiz.html');
const workerSource = read('worker/src/index.ts');
const originSource = read('src/lib/origin.ts');

describe('social sharing preview contract', () => {
  it('shares the quiz title in the deep link and social messages', () => {
    expect(shareModal).toContain('getPublicQuizShareUrl(quizId, quizTitle, isChallengeMode)');
    expect(shareModal).toContain('api.whatsapp.com/send?text=');
    expect(shareModal).toContain('quizTitle');
    expect(shareModal).toContain('facebook.com/sharer/sharer.php?u=');
    expect(shareModal).toContain('&quote=${encodeURIComponent(shareText)}');
    expect(shareModal).toContain('quiz-share-card.jpg');
  });

  it('shares the site using the GitHub Pages base path and both social targets', () => {
    expect(motivationHub).toContain('getAppBaseUrl()');
    expect(motivationHub).toContain('wa.me/?text=');
    expect(motivationHub).toContain('facebook.com/sharer/sharer.php?u=');
    expect(motivationHub).toContain('siteShareText');
  });

  it('keeps user-facing quiz links on the branded app domain', () => {
    const shareStart = originSource.indexOf('export function getPublicQuizShareUrl');
    const shareEnd = originSource.indexOf('export function getApiUrl');
    const shareFunction = originSource.slice(shareStart, shareEnd);
    expect(shareFunction).toContain("return `${appBase}/share/quiz.html?${query}`;");
    expect(shareFunction).not.toContain('workerBase');
    expect(shareFunction).toContain('account-derived workers.dev subdomain');
  });

  it('renders a crawler-readable dynamic quiz share page on the Worker', () => {
    expect(workerSource).toContain("const isPublicQuizShare = request.method === 'GET' && path === '/share/quiz';");
    expect(workerSource).toContain('async function renderQuizSharePage');
    expect(workerSource).toContain('select=title,description&limit=1');
    expect(workerSource).toContain('og:title');
    expect(workerSource).toContain('quiz-share-card.jpg');
    expect(workerSource).toContain('og:image');
    expect(workerSource).toContain('isAllowedShareBase');
  });

  it('provides crawler-readable image metadata for the site and static fallback share page', () => {
    expect(siteHtml).toContain('https://koomn1.github.io/quiz-space/share-card.jpg');
    expect(siteHtml).toContain('og:image:alt');
    expect(quizHtml).toContain('https://koomn1.github.io/quiz-space/quiz-share-card.jpg');
    expect(quizHtml).toContain('twitter:title');
    expect(quizHtml).toContain("params.get('title')");
  });
});
