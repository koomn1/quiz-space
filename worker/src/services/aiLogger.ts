import type { Env } from '../platform';

export type AiErrorCategory = 'timeout' | 'rate_limit' | 'http_4xx' | 'http_5xx' | 'invalid_response' | 'empty_response' | 'provider_error';

export class AiProviderError extends Error {
  constructor(
    readonly category: AiErrorCategory,
    readonly provider?: string,
    readonly model?: string,
    readonly status?: number,
  ) {
    super(category);
    this.name = 'AiProviderError';
  }
}

export function aiErrorCategoryFromStatus(status: number): AiErrorCategory {
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'http_5xx';
  if (status >= 400) return 'http_4xx';
  return 'provider_error';
}

export function safeAiErrorCategory(error: unknown): AiErrorCategory {
  if (error instanceof AiProviderError) return error.category;
  if (error instanceof DOMException && error.name === 'AbortError') return 'timeout';
  const raw = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  if (raw.includes('timeout') || raw.includes('aborted')) return 'timeout';
  if (raw.includes('invalid json') || raw.includes('invalid_response') || raw.includes('shape')) return 'invalid_response';
  return 'provider_error';
}

export function safeAiErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'Unknown AI worker error');
  return raw
    .replace(/Bearer[:\s]+(?:\\?["'])?[^\s"'\\]+(?:\\?["'])?/gi, 'Bearer [redacted]')
    .replace(/Bearer[:\s]+["']?[^\s"']+["']?/gi, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/AIza[0-9A-Za-z-_]{16,64}/g, '[redacted]')
    .replace(/tvly-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/sbp_[A-Za-z0-9_]+/g, '[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 480);
}

export async function logAiPerformance(env: Env, authHeader: string, data: {
  user_id: string;
  operation: string;
  provider: string;
  model?: string;
  chunk_count?: number;
  total_pages?: number;
  status: 'success' | 'error';
  latency_ms: number;
  error_message?: string;
  error_category?: AiErrorCategory;
}) {
  if (env.SUPABASE_URL.includes('placeholder')) return;
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_performance_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': authHeader,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const details = (await response.text()).slice(0, 280);
      console.error('AI performance logging rejected', response.status, details);
    }
  } catch (e) {
    console.error('Logging failed', e);
  }
}
