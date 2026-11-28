import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const robotsTxt = readFileSync(resolve(process.cwd(), 'public/robots.txt'), 'utf8');
const sitemapXml = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
const guestLanding = readFileSync(resolve(process.cwd(), 'src/pages/GuestLandingPage.tsx'), 'utf8');

describe('Google indexing contract', () => {
  it('declares pages.dev as the indexable canonical site', () => {
    expect(indexHtml).toContain('<link rel="canonical" href="https://www.quiz-space.live/" />');
    expect(indexHtml).toContain('<meta name="robots" content="index, follow, max-image-preview:large" />');
    expect(indexHtml).toContain('<title>QuizSpace | منصة الاختبارات الذكية</title>');
    expect(indexHtml).toContain('https://www.quiz-space.live/');
  });

  it('publishes a crawler-readable robots policy and sitemap', () => {
    expect(robotsTxt).toContain('Allow: /');
    expect(robotsTxt).toContain('Disallow: /api/');
    expect(robotsTxt).toContain('Sitemap: https://www.quiz-space.live/sitemap.xml');
    expect(sitemapXml).toContain('<loc>https://www.quiz-space.live/</loc>');
  });

  it('keeps the public landing page meaningful without authentication', () => {
    expect(guestLanding).toContain('<h1');
    expect(guestLanding).toContain('تعلّم. نافس. تصدّر المدار.');
    expect(guestLanding).toContain('QuizSpace يجمع الاختبارات');
  });
});
