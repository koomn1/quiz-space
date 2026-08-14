import { GeneratedQuiz } from '../types';

const ARABIC_LETTER = /[\u0621-\u064A]/u;
const UNSUPPORTED_SCRIPT = /[\u0400-\u052F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;
const LOWERCASE_LATIN_WORD = /\b[a-z]{3,}\b/u;

export function requiresArabicGeneration(topic: string): boolean {
  return ARABIC_LETTER.test(topic);
}

function contentFields(quiz: GeneratedQuiz): string[] {
  return [
    quiz.title,
    quiz.description,
    ...quiz.questions.flatMap((question) => [
      question.text,
      question.explanation || '',
      question.correctAnswer || '',
      ...(question.options || []),
    ]),
  ].filter((value): value is string => typeof value === 'string');
}

export function hasUnexpectedForeignLanguage(quiz: GeneratedQuiz): boolean {
  return contentFields(quiz).some((value) => (
    UNSUPPORTED_SCRIPT.test(value) || LOWERCASE_LATIN_WORD.test(value)
  ));
}
