import { GeneratedQuiz } from '../types';
import { explainWithGemini, generateQuizWithProvider } from './aiWorkerClient';

export function generateWithGemini(topic: string, amount: number, alreadyGeneratedQuestions: string[] = []): Promise<GeneratedQuiz> {
  return generateQuizWithProvider('gemini', topic, amount, alreadyGeneratedQuestions);
}

export function explainQuestionWithGemini(questionText: string, options: string[], correctAnswer: string): Promise<{ explanation: string }> {
  return explainWithGemini(questionText, options, correctAnswer);
}
