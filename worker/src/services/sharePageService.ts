import type { Env } from '../platform';
import { escapeHtml } from './documentParsers';

export function isAllowedShareBase(value: string): boolean {
  return /^https:\/\/((?:www\.)?quiz-space\.live|quiz-space-app\.pages\.dev|koomn1\.github\.io\/quiz-space|quizspace\.app)(?:\/)?$/i.test(value);
}

export const CLEAN_SHARE_ORIGIN = 'https://quiz-space-share.pages.dev';

export function isSocialCrawler(request: Request): boolean {
  const userAgent = request.headers.get('User-Agent') || '';
  return /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|googlebot|bingbot|crawler|spider|bot\b/i.test(userAgent);
}

export function getCleanQuizShareUrl(requestUrl: URL): string {
  const requestedBase = (requestUrl.searchParams.get('base') || '').trim().replace(/\/$/, '');
  const appBase = isAllowedShareBase(requestedBase) ? requestedBase : 'https://www.quiz-space.live';
  const query = new URLSearchParams();
  const quizId = (requestUrl.searchParams.get('quiz') || '').trim().slice(0, 120);
  const title = (requestUrl.searchParams.get('title') || '').trim().slice(0, 160);
  if (quizId) query.set('quiz', quizId);
  if (title) query.set('title', title);
  if (requestUrl.searchParams.get('challenge') === 'true') query.set('challenge', 'true');
  return `${CLEAN_SHARE_ORIGIN}/share/quiz?${query.toString()}`;
}

export async function renderQuizSharePage(request: Request, env: Env): Promise<Response> {
  const requestUrl = new URL(request.url);
  const quizId = (requestUrl.searchParams.get('quiz') || '').trim().slice(0, 120);
  const requestedTitle = (requestUrl.searchParams.get('title') || '').trim().slice(0, 160);
  const requestedBase = (requestUrl.searchParams.get('base') || '').trim().replace(/\/$/, '');
  const appBase = isAllowedShareBase(requestedBase) ? requestedBase : 'https://www.quiz-space.live';
  const cleanShareUrl = getCleanQuizShareUrl(requestUrl);
  let title = requestedTitle || 'اختبار تفاعلي جديد';
  let description = 'حل الاختبار الآن وشارك التحدي مع أصدقائك على Quiz Space.';

  // Only fetch the allow-listed title/description for a public quiz. Never expose
  // questions or private daily payloads through this crawler-facing page.
  if (quizId && !quizId.startsWith('daily-')) {
    try {
      const endpoint = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/quizzes?id=eq.${encodeURIComponent(quizId)}&select=title,description&limit=1`;
      const response = await fetch(endpoint, { headers: { apikey: env.SUPABASE_ANON_KEY } });
      if (response.ok) {
        const rows = await response.json() as Array<{ title?: string; description?: string }>;
        if (rows[0]?.title) title = String(rows[0].title).slice(0, 160);
        if (rows[0]?.description) description = String(rows[0].description).slice(0, 240);
      }
    } catch (error) {
      console.warn('Unable to load public quiz share metadata:', error);
    }
  }

  const challenge = requestUrl.searchParams.get('challenge') === 'true';
  const pageTitle = `${title} | Quiz Space`;
  const imageUrl = `${appBase}/quiz-share-card.jpg`;
  const target = `${appBase}/#/quiz/${encodeURIComponent(quizId)}${challenge ? '?challenge=true' : ''}`;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(pageTitle)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(target)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Quiz Space"><meta property="og:title" content="${escapeHtml(pageTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(cleanShareUrl)}"><meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:alt" content="صورة تحدي Quiz Space"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="675"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(pageTitle)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(imageUrl)}"><meta name="twitter:image:alt" content="صورة تحدي Quiz Space"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090b2a;color:#fff;font-family:Arial,sans-serif}main{text-align:center;padding:2rem}a{color:#c4b5fd}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(challenge ? 'استعد للتحدي ونافس أصدقاءك.' : 'حل الاختبار الآن وشارك نتيجتك.')}</p><a href="${escapeHtml(target)}">فتح الاختبار</a></main><script>setTimeout(function(){location.replace(${JSON.stringify(target)});},250);</script></body></html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'index, follow' } });
}
