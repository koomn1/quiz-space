import { fetchWithAuth } from '../lib/authFetch';
import { getApiUrl } from '../lib/origin';
import { GeneratedQuiz } from '../types';

export type AiProvider = 'gemini' | 'groq' | 'deepseek' | 'openai';

interface WorkerError {
  error?: string;
}

async function workerRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuth(getApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as WorkerError;
    throw new Error(payload.error || `AI service failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export function generateQuizWithProvider(
  provider: AiProvider,
  topic: string,
  amount: number,
  alreadyGeneratedQuestions: string[] = [],
): Promise<GeneratedQuiz> {
  return workerRequest<GeneratedQuiz>('/api/ai/generate', {
    provider,
    topic,
    amount,
    alreadyGeneratedQuestions,
  });
}

export function explainWithGemini(
  questionText: string,
  options: string[],
  correctAnswer: string,
): Promise<{ explanation: string }> {
  return workerRequest<{ explanation: string }>('/api/ai/explain', {
    questionText,
    options,
    correctAnswer,
  });
}

export function generateQuizFromFile(
  fileBase64: string,
  mimeType: string,
  amount: number,
  customInstruction?: string,
): Promise<GeneratedQuiz> {
  return workerRequest<GeneratedQuiz>('/api/ai/generate-file', {
    fileBase64,
    mimeType,
    amount,
    customInstruction,
  });
}

export interface GeminiMessage {
  role: 'user' | 'model';
  text: string;
}

export function askGemini(
  prompt: string,
  options: { model?: string; systemInstruction?: string; history?: GeminiMessage[]; image?: { data: string; mimeType: string } } = {},
): Promise<{ text: string }> {
  return workerRequest<{ text: string }>('/api/ai/gemini', { prompt, ...options });
}
