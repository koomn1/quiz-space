import { fetchWithAuth } from '../lib/authFetch';
import { getApiUrl } from '../lib/origin';
import { GeneratedQuiz } from '../types';
import { supabase } from '../lib/supabaseClient';

export type AiProvider = 'openrouter' | 'groq' | 'deepseek' | 'openai';

interface WorkerError {
  error?: string;
}

const AI_REQUEST_TIMEOUT_MS = 45_000;

async function workerRequest<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchWithAuth(getApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.ok) {
      return response.json() as Promise<T>;
    }
    const payload = await response.json().catch(() => ({})) as WorkerError;
    throw new Error(payload.error || `AI service failed (${response.status}).`);
  } catch (err: any) {
    console.error("AI Worker request failed:", err);

    // Re-throw the original error message from the worker (payload.error) if available
    if (err?.message && !err.message.includes("Unable to reach")) {
      throw err;
    }
    
    // لا تستخدم OpenRouter من المتصفح إطلاقًا
    throw new Error(
      "Unable to reach the AI Worker. Please check VITE_AI_WORKER_URL, Cloudflare deployment, or CORS configuration."
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function workerGet<T>(path: string): Promise<T> {
  try {
    const response = await fetchWithAuth(getApiUrl(path), { method: 'GET' });
    if (response.ok) return response.json() as Promise<T>;
    const payload = await response.json().catch(() => ({})) as WorkerError;
    throw new Error(payload.error || `AI service failed (${response.status}).`);
  } catch (err: any) {
    if (err?.message && !err.message.includes('Unable to reach')) throw err;
    throw new Error('Unable to reach the AI Worker. Please check your connection and try again.');
  }
}

export type ExtractionJobStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface ExtractionJob {
  id: string;
  status: ExtractionJobStatus;
  progressPercentage: number;
  processedChunks: number;
  totalChunks: number | null;
  progressMessage: string | null;
  quiz: GeneratedQuiz | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExtractionJobOptions {
  file: File;
  extractionMode: 'literal' | 'generate';
  customInstruction?: string;
  requestedQuestionCount: number;
  idempotencyKey?: string;
}

const EXTRACTION_UPLOAD_BUCKET = 'quiz-extraction-uploads';
const EXTRACTION_JOB_STORAGE_KEY = 'quizspace.pending-extraction-job';
const EXTRACTION_IDEMPOTENCY_STORAGE_PREFIX = 'quizspace.extraction-job.';
const MAX_EXTRACTION_FILE_BYTES = 12 * 1024 * 1024;

function safeFileName(fileName: string): string {
  const normalized = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return (normalized || 'source-document').slice(0, 120);
}

function createIdempotencyKey(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function rememberPendingExtractionJob(job: ExtractionJob): void {
  if (typeof window === 'undefined') return;
  if (job.status === 'complete' || job.status === 'error') {
    window.localStorage.removeItem(EXTRACTION_JOB_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(EXTRACTION_JOB_STORAGE_KEY, JSON.stringify({ id: job.id, updatedAt: job.updatedAt }));
}

export function getRememberedExtractionJobId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(EXTRACTION_JOB_STORAGE_KEY) || 'null');
    return typeof value?.id === 'string' ? value.id : null;
  } catch {
    return null;
  }
}

function getCachedExtractionJobId(idempotencyKey?: string): string | null {
  if (!idempotencyKey || typeof window === 'undefined') return null;
  return window.localStorage.getItem(`${EXTRACTION_IDEMPOTENCY_STORAGE_PREFIX}${idempotencyKey}`);
}

function cacheExtractionJobId(idempotencyKey: string, jobId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${EXTRACTION_IDEMPOTENCY_STORAGE_PREFIX}${idempotencyKey}`, jobId);
}

export async function createExtractionJob(options: CreateExtractionJobOptions): Promise<ExtractionJob> {
  if (!options.file || options.file.size <= 0 || options.file.size > MAX_EXTRACTION_FILE_BYTES) {
    throw new Error('حجم الملف يجب أن يكون أقل من 12 ميجابايت.');
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (sessionError || !user) throw new Error('سجّل الدخول أولاً لرفع الملف ومعالجته بأمان.');

  const idempotencyKey = options.idempotencyKey || createIdempotencyKey();
  const cachedJobId = getCachedExtractionJobId(idempotencyKey);
  if (cachedJobId) {
    try {
      const cachedJob = await getExtractionJob(cachedJobId);
      if (cachedJob.status !== 'error') return cachedJob;
    } catch {
      // The server remains the authority for idempotency. Continue with a fresh
      // upload only when an earlier local cache record is no longer reachable.
    }
  }

  const mimeType = options.file.type || 'application/pdf';
  const storagePath = `${user.id}/${crypto.randomUUID()}/${safeFileName(options.file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(EXTRACTION_UPLOAD_BUCKET)
    .upload(storagePath, options.file, { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error('تعذر رفع الملف الخاص. أعد المحاولة بعد التأكد من الاتصال.');

  try {
    const response = await workerRequest<{ job: ExtractionJob }>('/api/ai/extraction-jobs', {
      idempotencyKey,
      fileStoragePath: storagePath,
      mimeType,
      extractionMode: options.extractionMode,
      customInstruction: options.customInstruction,
      // Zero is the UI sentinel for "automatic". Omitting the field keeps the
      // database's positive-count constraint intact and lets literal extraction
      // recover every source question.
      requestedQuestionCount: options.requestedQuestionCount > 0 ? options.requestedQuestionCount : undefined,
    });
    rememberPendingExtractionJob(response.job);
    cacheExtractionJobId(idempotencyKey, response.job.id);
    return response.job;
  } catch (error) {
    await supabase.storage.from(EXTRACTION_UPLOAD_BUCKET).remove([storagePath]);
    throw error;
  }
}

export async function getExtractionJob(jobId: string): Promise<ExtractionJob> {
  const job = await workerGet<ExtractionJob>(`/api/ai/extraction-jobs/${encodeURIComponent(jobId)}`);
  rememberPendingExtractionJob(job);
  return job;
}

export async function listActiveExtractionJobs(): Promise<ExtractionJob[]> {
  const response = await workerGet<{ jobs: ExtractionJob[] }>('/api/ai/extraction-jobs');
  response.jobs.forEach(rememberPendingExtractionJob);
  return response.jobs;
}

export async function generateQuizWithProvider(
  provider: AiProvider,
  topic: string,
  amount: number,
  alreadyGeneratedQuestions: string[] = [],
): Promise<GeneratedQuiz> {
  try {
    return await workerRequest<GeneratedQuiz>('/api/ai/generate', {
      provider,
      topic,
      amount,
      alreadyGeneratedQuestions,
    });
  } catch (err) {
    throw err;
  }
}

export async function explainWithAI(
  questionText: string,
  options: string[],
  correctAnswer: string,
): Promise<{ explanation: string }> {
  try {
    return await workerRequest<{ explanation: string }>('/api/ai/explain', {
      questionText,
      options,
      correctAnswer,
    });
  } catch (err) {
    throw err;
  }
}

export async function generateQuizFromFile(
  fileBase64: string,
  mimeType: string,
  amount: number,
  customInstruction?: string,
  extractionMode?: 'literal' | 'generate',
): Promise<GeneratedQuiz> {
  try {
    return await workerRequest<GeneratedQuiz>('/api/ai/generate-file', {
      fileBase64,
      mimeType,
      amount,
      customInstruction,
      extractionMode,
    });
  } catch (err) {
    throw err;
  }
}

export interface FileQuizGenerationResult {
  quiz: GeneratedQuiz;
  provider: string;
}

// Fallback version: tries multiple providers in sequence (same as generateQuizWithFallback)
export async function generateQuizFromFileWithFallback(
  fileBase64: string,
  mimeType: string,
  amount: number,
  customInstruction?: string,
  extractionMode?: 'literal' | 'generate',
): Promise<GeneratedQuiz> {
  const providers = ['groq', 'openrouter', 'deepseek', 'openai'] as AiProvider[];
  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      return await workerRequest<GeneratedQuiz>('/api/ai/generate-file', {
        provider,
        fileBase64,
        mimeType,
        amount,
        customInstruction,
        extractionMode,
      });
    } catch (err: any) {
      lastError = err;
      console.warn(`Provider ${provider} failed for file generation, trying next:`, err?.message || err);
    }
  }

  throw lastError || new Error('All providers failed for file generation.');
}

export interface AiChatAttachment {
  data: string;
  mimeType: string;
  name: string;
  kind: 'image' | 'file';
}

export interface AiChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function askAI(
  prompt: string,
  options: { model?: string; systemInstruction?: string; history?: AiChatMessage[]; image?: { data: string; mimeType: string }; attachment?: AiChatAttachment; currentPage?: string; siteStatus?: string } = {},
): Promise<{ text: string }> {
  try {
    return await workerRequest<{ text: string }>('/api/ai/openrouter', { prompt, ...options });
  } catch (err) {
    throw err;
  }
}

// Streaming counterpart to askAI. Calls onChunk(deltaText) as tokens arrive
// for a live-typing effect, and resolves with the full final text once the
// stream ends. Falls back to a clear error if the connection itself fails
// before any token arrives (model-level fallback already happened
// server-side by then).
export async function askAIStream(
  prompt: string,
  options: { systemInstruction?: string; history?: AiChatMessage[]; image?: { data: string; mimeType: string }; attachment?: AiChatAttachment; currentPage?: string; siteStatus?: string },
  onChunk: (deltaText: string, fullTextSoFar: string) => void,
): Promise<{ text: string }> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
  let response: Response;
  let fullText = '';

  const consumeSseLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    let dataStr = trimmed.slice(5).trim();
    if (!dataStr) return;
    // OpenRouter prepends [OPENAI_STREAM_CHUNK] to some models (gpt-oss etc.)
    if (dataStr.startsWith('[OPENAI_STREAM_CHUNK]')) dataStr = dataStr.slice(21);
    if (dataStr === '[DONE]') return;
    try {
      const parsed = JSON.parse(dataStr);
      const delta: string = parsed.choices?.[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        onChunk(delta, fullText);
      }
    } catch {
      // Ignore malformed/partial SSE lines.
    }
  };

  try {
    response = await fetchWithAuth(getApiUrl('/api/ai/openrouter/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ...options }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => ({})) as WorkerError;
      if (response.status >= 500) {
        return workerRequest<{ text: string }>('/api/ai/openrouter', { prompt, ...options });
      }
      throw new Error(payload.error || `AI streaming failed (${response.status}).`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(consumeSseLine);
    }
    // Some proxies close the stream without a final newline. Do not discard
    // the final JSON chunk in that case.
    if (buffer.trim()) consumeSseLine(buffer);
  } catch (error) {
    if (!fullText) {
      return workerRequest<{ text: string }>('/api/ai/openrouter', { prompt, ...options });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!fullText) {
    return workerRequest<{ text: string }>('/api/ai/openrouter', { prompt, ...options });
  }
  return { text: fullText };
}

// Groq counterpart to askAI, used to power AI's chat as an alternative provider.
export async function askGroq(
  prompt: string,
  options: { model?: string; systemInstruction?: string; history?: AiChatMessage[] } = {},
): Promise<{ text: string }> {
  try {
    return await workerRequest<{ text: string }>('/api/ai/groq', { prompt, ...options });
  } catch (err) {
    throw err;
  }
}

export interface StreamProgress {
  type: 'init' | 'progress' | 'complete' | 'error';
  totalChunks?: number;
  totalPages?: number;
  processed?: number;
  total?: number;
  questionsExtracted?: number;
  percentage?: number;
  quiz?: GeneratedQuiz;
  message?: string;
  warning?: string;
}

export async function generateQuizFromFileStreaming(
  fileBase64: string,
  mimeType: string,
  customInstruction?: string,
  onProgress?: (progress: StreamProgress) => void,
  extractionMode: 'literal' | 'generate' = 'literal',
): Promise<GeneratedQuiz> {
  try {
    const response = await fetchWithAuth(getApiUrl('/api/ai/generate-file/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64,
        mimeType,
        customInstruction,
        extractionMode,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as WorkerError;
      throw new Error(payload.error || `AI service failed (${response.status}).`);
    }

    if (!response.body) {
      throw new Error('No response body from streaming endpoint');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalQuiz: GeneratedQuiz | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr) as StreamProgress;
          onProgress?.(parsed);

          if (parsed.type === 'complete' && parsed.quiz) {
            finalQuiz = parsed.quiz;
          }
        } catch (e) {
          console.warn('Failed to parse SSE message:', e);
        }
      }
    }

    if (!finalQuiz) {
      throw new Error('No quiz data received from streaming endpoint');
    }

    return finalQuiz;
  } catch (err: any) {
    console.error('Streaming generation failed:', err);
    throw err;
  }
}
