import { fetchWithAuth } from '../lib/authFetch';
import { getApiUrl } from '../lib/origin';
import { GeneratedQuiz } from '../types';

export type AiProvider = 'openrouter' | 'groq' | 'deepseek' | 'openai';

interface WorkerError {
  error?: string;
}

async function workerRequest<T>(path: string, body: unknown): Promise<T> {
  try {
    const response = await fetchWithAuth(getApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
  }
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
  let response: Response;
  try {
    response = await fetchWithAuth(getApiUrl('/api/ai/openrouter/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ...options }),
    });
  } catch {
    return workerRequest<{ text: string }>('/api/ai/openrouter', { prompt, ...options });
  }

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
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // keep the last (possibly incomplete) line for next chunk

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      let dataStr = trimmed.slice(5).trim();
      if (!dataStr) continue;
      // OpenRouter prepends [OPENAI_STREAM_CHUNK] to some models (gpt-oss etc.)
      if (dataStr.startsWith('[OPENAI_STREAM_CHUNK]')) {
        dataStr = dataStr.slice(21);
      }
      if (dataStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(dataStr);
        const delta: string = parsed.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          onChunk(delta, fullText);
        }
      } catch {
        // Ignore malformed/partial SSE lines
      }
    }
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
