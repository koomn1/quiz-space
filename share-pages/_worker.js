const APP_FALLBACK = 'https://quiz-space-app.pages.dev';
const SHARE_ORIGIN = 'https://quiz-space-share.pages.dev';
const SHARE_PATHS = new Set(['/share/quiz', '/share/quiz/']);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isAllowedAppBase(value) {
  return /^https:\/\/(quiz-space-app\.pages\.dev|koomn1\.github\.io\/quiz-space|quizspace\.app)(?:\/)?$/i.test(value);
}

function getAppBase(url) {
  const requested = (url.searchParams.get('base') || '').trim().replace(/\/$/, '');
  return isAllowedAppBase(requested) ? requested : APP_FALLBACK;
}

function getQuizId(url) {
  return (url.searchParams.get('quiz') || '').trim().slice(0, 120);
}

function getQuizTitle(url) {
  return (url.searchParams.get('title') || '').trim().slice(0, 160) || 'اختبار تفاعلي جديد';
}

function getCleanShareUrl(url) {
  const target = new URL(`${SHARE_ORIGIN}/share/quiz`);
  for (const key of ['quiz', 'title', 'challenge', 'base']) {
    const value = url.searchParams.get(key);
    if (value) target.searchParams.set(key, value.slice(0, key === 'title' ? 160 : 240));
  }
  return target.href;
}

function getTargetAppUrl(url) {
  const appBase = getAppBase(url);
  const quizId = encodeURIComponent(getQuizId(url));
  const challenge = url.searchParams.get('challenge') === 'true' ? '?challenge=true' : '';
  return `${appBase}/#/quiz/${quizId}${challenge}`;
}

function isSocialCrawler(request) {
  const userAgent = request.headers.get('User-Agent') || '';
  return /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|googlebot|bingbot|crawler|spider|bot\b/i.test(userAgent);
}

function renderMetadataPage(url) {
  const title = getQuizTitle(url);
  const pageTitle = `${title} | Quiz Space`;
  const description = `حل «${title}» الآن وشارك التحدي مع أصدقائك على Quiz Space.`;
  const target = getTargetAppUrl(url);
  const canonical = getCleanShareUrl(url);
  const imageUrl = `${APP_FALLBACK}/quiz-share-card.jpg`;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(pageTitle)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(target)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Quiz Space"><meta property="og:title" content="${escapeHtml(pageTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:alt" content="صورة تحدي Quiz Space"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="675"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(pageTitle)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(imageUrl)}"><meta name="twitter:image:alt" content="صورة تحدي Quiz Space"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090b2a;color:#fff;font-family:Arial,sans-serif}main{text-align:center;padding:2rem}a{color:#c4b5fd}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(url.searchParams.get('challenge') === 'true' ? 'استعد للتحدي ونافس أصدقاءك.' : 'حل الاختبار الآن وشارك نتيجتك.')}</p><a href="${escapeHtml(target)}">فتح الاختبار</a></main><script>setTimeout(function(){location.replace(${JSON.stringify(target)});},250);</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'index, follow',
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || !SHARE_PATHS.has(url.pathname)) {
      return new Response('Not found', { status: 404 });
    }
    if (!isSocialCrawler(request)) {
      return Response.redirect(getTargetAppUrl(url), 302);
    }
    return renderMetadataPage(url);
  },
};
