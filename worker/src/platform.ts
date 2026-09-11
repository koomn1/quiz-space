import type { ExtractionJobRow } from './extractionJobs';

export interface Env {
  OPENROUTER_API_KEY: string;
  /** Server-only web search key; never expose this to the React bundle. */
  TAVILY_API_KEY?: string;
  GEMINI_API_KEY?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  /** Optional server-only key used only by queue consumers; never sent to clients. */
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALLOWED_ORIGIN: string;
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
}

export function supabaseBaseUrl(env: Env): string {
  return env.SUPABASE_URL.replace(/\/$/, '');
}

export function publicExtractionJob(job: ExtractionJobRow) {
  return {
    id: job.id,
    status: job.status,
    progressPercentage: job.progress_percentage,
    processedChunks: job.processed_chunks,
    totalChunks: job.total_chunks,
    progressMessage: job.progress_message,
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
