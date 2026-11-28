// Canonical host enforcement (Cloudflare Pages advanced mode).
// 301 any non-canonical host (quiz-space-app.pages.dev, apex quiz-space.live,
// or any future alias) to https://www.quiz-space.live, preserving path and
// query string. Browsers re-attach the #hash fragment across redirects, so
// hash routes (/#/join/..., /?quiz=...) survive the move.
// Everything else falls through to the static asset pipeline, which keeps
// applying public/_headers.
const CANONICAL_HOST = 'www.quiz-space.live';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.toLowerCase() !== CANONICAL_HOST) {
      return new Response(null, {
        status: 301,
        headers: {
          Location: `https://${CANONICAL_HOST}${url.pathname}${url.search}`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
