import type { ExtractionJobRow } from './types';

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /** Primary text-generation provider. */
  INCEPTION_API_KEY?: string;
  /** Optional multimodal page/image reviewer. */
  XKIRO_API_KEY?: string;
  /** Munsit Arabic TTS key (owner-funded credits); lessons fall back to the browser voice without it. */
  MUNSIT_API_KEY?: string;
  /** Server-only web search key; never expose this to the React bundle. */
  TAVILY_API_KEY?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  /** Optional server-only key used only by queue consumers; never sent to clients. */
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALLOWED_ORIGIN: string;
  /** Optional Cloudflare Rate Limiting bindings. When absent, the per-isolate in-memory limiter is used. */
  RL_IP?: RateLimitBinding;
  RL_AI_GUEST?: RateLimitBinding;
  RL_AI_AUTH?: RateLimitBinding;
  RL_EXPENSIVE_GUEST?: RateLimitBinding;
  RL_EXPENSIVE_AUTH?: RateLimitBinding;
  EXTRACTION_JOBS: {
    send(message: ExtractionQueueMessage): Promise<void>;
  };
}

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface ExtractionQueueMessage {
  jobId: string;
  /** Legacy queue messages may carry a user token; new messages rely on the server key. */
  authHeader?: string;
  chunkId?: string;
  taskId?: string;
}

export function supabaseBaseUrl(env: Env): string {
  return env.SUPABASE_URL.replace(/\/$/, '');
}

export function publicExtractionJob(job: ExtractionJobRow) {
  const questions = Array.isArray(job.questions_json) ? job.questions_json : [];
  const reviewRequiredQuestions = questions.filter((question: any) => question && typeof question === 'object' && Number(question.correctIndex) < 0).length;
  return {
    id: job.id,
    status: job.status,
    progressPercentage: job.progress_percentage,
    processedChunks: job.processed_chunks,
    totalChunks: job.total_chunks,
    progressMessage: job.progress_message,
    sourceFileName: job.source_file_name,
    extractedQuestions: questions.length,
    completedQuestions: job.status === 'complete' ? questions.length : 0,
    reviewRequiredQuestions,
    estimatedSecondsRemaining: null,
    quiz: job.status === 'complete' && Array.isArray(job.questions_json)
      ? {
          title: job.quiz_title || 'اختبار مستخرج',
          description: job.quiz_description || '',
          questions: job.questions_json,
        }
      : null,
    errorMessage: job.status === 'error' ? job.error_message : null,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
}
