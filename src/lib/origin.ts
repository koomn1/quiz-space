/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolves the true client-facing origin of the application.
 * Prevents sharing links containing "aistudio.google.com" or localhost when running inside iframe.
 */
function sanitizeAndSecureOrigin(origin: string): string {
  if (!origin) return '';
  let result = origin.trim();
  if (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  // Upgrade http to https for any non-localhost origins in sandboxed iframes/deployments to prevent Mixed Content blocking.
  if (result.startsWith('http://') && !result.includes('localhost') && !result.includes('127.0.0.1')) {
    const isHttpsContext = typeof window !== 'undefined' && window.location && 
      (window.location.protocol === 'https:' || (window.location.href && window.location.href.startsWith('https:')));
    if (result.includes('.run.app') || isHttpsContext) {
      result = result.replace('http://', 'https://');
    }
  }
  return result;
}

export function getAppOrigin(): string {
  let matchedOrigin = '';

  // 0. Use server-injected origin if available (highly resilient inside sandboxed frames with null origins)
  if (typeof window !== 'undefined' && (window as any).__APPMAP_ORIGIN__) {
    const origin = (window as any).__APPMAP_ORIGIN__;
    if (origin && !origin.includes('aistudio.google.com')) {
      matchedOrigin = origin;
    }
  }

  // 1. Try to read from import.meta.url (Vite ES Module script URL)
  // Highly resilient inside iframe sandboxes with null origin or opaque window location, and always maps to our own backend/frontend host!
  if (!matchedOrigin && typeof import.meta !== 'undefined' && import.meta.url) {
    try {
      const match = import.meta.url.match(/^(https?:\/\/[^\/]+)/);
      if (match && match[1] && !match[1].includes('aistudio.google.com')) {
        matchedOrigin = match[1];
      }
    } catch (_) {}
  }

  // 2. Try window.location.origin if it is valid (not aistudio.google.com or null)
  if (!matchedOrigin && typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && !origin.includes('aistudio.google.com') && origin !== 'null') {
      matchedOrigin = origin;
    }
  }

  // 3. Try window.location.href to parse true protocol and domain if sandboxed
  if (!matchedOrigin && typeof window !== 'undefined' && window.location) {
    try {
      const href = window.location.href;
      const match = href.match(/^(https?:\/\/[^\/]+)/);
      if (match && match[1] && !match[1].includes('aistudio.google.com') && !match[1].includes('null')) {
        matchedOrigin = match[1];
      }
    } catch (_) {}
  }

  // 4. Try to read from localStorage cached server origin
  if (!matchedOrigin) {
    try {
      const cached = localStorage.getItem('quiz_app_origin');
      if (cached && !cached.includes('aistudio.google.com')) {
        matchedOrigin = cached;
      }
    } catch (e) {
      console.error('Error reading quiz_app_origin from localStorage:', e);
    }
  }

  // 5. Try to extract from script tags or stylesheet links on the document as fallback.
  // We exclude known third-party CDNs and Google service domains to prevent matching external resources.
  if (!matchedOrigin && typeof document !== 'undefined') {
    try {
      const resources = Array.from(document.querySelectorAll('script[src], link[href]'));
      const externalDomains = [
        'googleapis.com', 'gstatic.com', 'google.com', 'googleusercontent.com', 'githubusercontent.com', 
        'firebaseapp.com', 'google-analytics.com', 'googletagmanager.com', 'unpkg.com', 'jsdelivr.net', 
        'cloudflare.com', 'identitytoolkit'
      ];
      for (const res of resources) {
        const url = (res as any).src || (res as any).href;
        if (url && typeof url === 'string' && url.startsWith('http')) {
          const match = url.match(/^(https?:\/\/[^\/]+)/);
          if (match && match[1] && !match[1].includes('aistudio.google.com')) {
            const hasExternal = externalDomains.some(dom => match[1].includes(dom));
            if (!hasExternal) {
              matchedOrigin = match[1];
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  // 6. Fallback if still custom or empty
  if (!matchedOrigin) {
    matchedOrigin = typeof window !== 'undefined' && window.location.origin !== 'null' ? window.location.origin : '';
  }

  return sanitizeAndSecureOrigin(matchedOrigin);
}

export function getAppBaseUrl(): string {
  const origin = getAppOrigin();
  const base = typeof import.meta !== 'undefined' ? (import.meta as any).env?.BASE_URL : '/';
  if (!base || base === '/') return origin || '';
  return `${origin}${base.replace(/\/$/, '')}`;
}

/**
 * Initializes the app origin - serverless version uses window.location directly.
 */
export async function initAppOrigin(): Promise<string> {
  // In serverless/GitHub Pages mode, no backend to query
  const origin = getAppOrigin();
  if (origin) {
    localStorage.setItem('quiz_app_origin', origin);
  }
  return origin;
}

/**
 * Resolves the absolute backend API URL.
 * Allows pointing to an external free backend server (like Render, Koyeb, or Railway)
 * via VITE_API_BASE_URL, otherwise defaults to local host.
 */
export function getApiUrl(path: string): string {
  let baseUrl =
    (import.meta as any).env?.VITE_API_BASE_URL ||
    (import.meta as any).env?.VITE_AI_WORKER_URL ||
    '';
  if (!baseUrl) {
    // Return absolute path using detected app origin to prevent iframe sandboxed 'null' origin / about:blank resolution failures
    const detectedOrigin = getAppOrigin();
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    return detectedOrigin ? `${detectedOrigin}${formattedPath}` : formattedPath;
  }
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl.replace(/\/$/, '')}${formattedPath}`;
}
