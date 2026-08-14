import { GeneratedQuiz } from '../types';

const ARABIC_LETTER = /[\u0621-\u064A]/u;
const UNSUPPORTED_SCRIPT = /[\u0400-\u052F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;
const LOWERCASE_LATIN_WORD = /\b[a-z]{3,}\b/u;
const FOREIGN_TEXT = /[\u0400-\u052F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]+(?:[\u064B-\u0652]|\u0627)?|\b[a-z]{3,}\b/gu;

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

function cleanArabicField(value: string): string {
  return value
    .replace(/，/gu, '،')
    .replace(FOREIGN_TEXT, ' ')
    .replace(/\s{2,}/gu, ' ')
    .replace(/\s+([،,.!?])/gu, '$1')
    .trim();
}

export function normalizeArabicGeneratedQuiz(quiz: GeneratedQuiz): GeneratedQuiz {
  return {
    ...quiz,
    title: cleanArabicField(quiz.title),
    description: cleanArabicField(quiz.description),
    questions: quiz.questions.map((question) => ({
      ...question,
      text: cleanArabicField(question.text),
      explanation: cleanArabicField(question.explanation || ''),
      correctAnswer: cleanArabicField(question.correctAnswer || ''),
      options: (question.options || []).map(cleanArabicField).filter(Boolean),
    })),
  };
}
