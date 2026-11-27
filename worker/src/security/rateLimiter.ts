export const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const MAX_JSON_BODY_BYTES = 56 * 1024 * 1024;
export const MAX_RATE_LIMIT_ENTRIES = 2_000;

export const RATE_LIMIT_POLICIES = {
  ai: { guest: 10, authenticated: 30 },
  expensive: { guest: 3, authenticated: 8 },
} as const;

export function rateLimitClass(path: string): keyof typeof RATE_LIMIT_POLICIES {
  return path.includes('generate') || path.includes('extraction-jobs') || path === '/api/ai/search'
    ? 'expensive'
    : 'ai';
}

export function requestBodyLimit(path: string): number {
  return path === '/api/ai/generate-file' || path === '/api/ai/generate-file/stream'
    ? MAX_JSON_BODY_BYTES
    : 2 * 1024 * 1024;
}

export function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  if (rateLimitMap.size > 2_000) {
    for (const [entryKey, entry] of rateLimitMap) {
      if (entry.resetAt <= now) rateLimitMap.delete(entryKey);
    }
    // Hard bound against memory exhaustion DoS if rapid flood of unique keys occurs
    if (rateLimitMap.size > 2_000) {
      const excess = rateLimitMap.size - 2_000;
      let removed = 0;
      for (const entryKey of rateLimitMap.keys()) {
        rateLimitMap.delete(entryKey);
        removed += 1;
        if (removed >= excess) break;
      }
    }
  }
  const current = rateLimitMap.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

type RateLimitBindingLike = { limit(options: { key: string }): Promise<{ success: boolean }> };

/**
 * Uses a Cloudflare Rate Limiting binding (shared across isolates) when one is configured.
 * Falls back to the in-memory limiter when the binding is missing (local dev, tests).
 * If the binding call itself throws, fall back too, so a platform hiccup never blocks users.
 */
export async function checkRateLimitWithBinding(
  binding: RateLimitBindingLike | undefined,
  key: string,
  fallbackLimit: number,
): Promise<boolean> {
  if (!binding) return checkRateLimit(key, fallbackLimit);
  try {
    const { success } = await binding.limit({ key });
    return success;
  } catch {
    return checkRateLimit(key, fallbackLimit);
  }
}
