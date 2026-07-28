import { GeneratedQuiz } from '../types';
import { generateQuizWithProvider } from './aiWorkerClient';

export function generateWithGroq(topic: string, amount: number, alreadyGeneratedQuestions: string[] = []): Promise<GeneratedQuiz> {
  return generateQuizWithProvider('groq', topic, amount, alreadyGeneratedQuestions);
}
