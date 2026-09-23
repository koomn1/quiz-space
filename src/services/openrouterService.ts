import { GeneratedQuiz } from '../types';
import { explainWithAI, generateQuizWithProvider } from './aiWorkerClient';

export function generateWithOpenRouter(topic: string, amount: number, alreadyGeneratedQuestions: string[] = [], automatic = false): Promise<GeneratedQuiz> {
  return generateQuizWithProvider('openrouter', topic, amount, alreadyGeneratedQuestions, automatic);
}

export function explainQuestionWithAI(questionText: string, options: string[], correctAnswer: string): Promise<{ explanation: string }> {
  return explainWithAI(questionText, options, correctAnswer);
}
