import { GeneratedQuiz } from '../types';
import { generateQuizWithProvider } from './aiWorkerClient';

export function generateWithOpenAI(topic: string, amount: number, alreadyGeneratedQuestions: string[] = []): Promise<GeneratedQuiz> {
  return generateQuizWithProvider('openai', topic, amount, alreadyGeneratedQuestions);
}
