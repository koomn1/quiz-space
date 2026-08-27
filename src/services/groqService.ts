import type { GeneratedQuiz } from '../types';
import { generateWithOpenRouter } from './openrouterService';

/**
 * Legacy name kept for compatibility with older imports. Runtime routing is
 * OpenRouter-only; this wrapper never contacts Groq.
 */
export function generateWithGroq(topic: string, amount: number, alreadyGeneratedQuestions: string[] = []): Promise<GeneratedQuiz> {
  return generateWithOpenRouter(topic, amount, alreadyGeneratedQuestions);
}
