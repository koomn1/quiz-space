import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const shareModal = read('src/components/ShareModal.tsx');
const motivationHub = read('src/components/MotivationHub.tsx');
const siteHtml = read('index.html');
const quizHtml = read('public/share/quiz.html');

describe('social sharing preview contract', () => {
  it('shares the quiz title in the deep link and social messages', () => {
    expect(shareModal).toContain('title=${encodeURIComponent(quizTitle.trim().slice(0, 160))}');
    expect(shareModal).toContain('api.whatsapp.com/send?text=');
    expect(shareModal).toContain('quizTitle');
    expect(shareModal).toContain('facebook.com/sharer/sharer.php?u=');
    expect(shareModal).toContain('&quote=${encodeURIComponent(shareText)}');
    expect(shareModal).toContain('quiz-share-card.png');
  });

  it('shares the site using the GitHub Pages base path and both social targets', () => {
    expect(motivationHub).toContain('getAppBaseUrl()');
    expect(motivationHub).toContain('wa.me/?text=');
    expect(motivationHub).toContain('facebook.com/sharer/sharer.php?u=');
    expect(motivationHub).toContain('siteShareText');
  });

  it('provides crawler-readable image metadata for the site and quiz share pages', () => {
    expect(siteHtml).toContain('https://koomn1.github.io/quiz-space/share-card.png');
    expect(siteHtml).toContain('og:image:alt');
    expect(quizHtml).toContain('https://koomn1.github.io/quiz-space/quiz-share-card.png');
    expect(quizHtml).toContain('twitter:title');
    expect(quizHtml).toContain("params.get('title')");
  });
});
