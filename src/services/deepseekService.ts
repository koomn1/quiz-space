import { GeneratedQuiz } from '../types';
import { generateQuizWithProvider } from './aiWorkerClient';

export function generateWithDeepSeek(topic: string, amount: number, alreadyGeneratedQuestions: string[] = []): Promise<GeneratedQuiz> {
  return generateQuizWithProvider('deepseek', topic, amount, alreadyGeneratedQuestions);
}
