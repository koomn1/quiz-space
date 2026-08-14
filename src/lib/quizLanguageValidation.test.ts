import { describe, expect, it } from 'vitest';
import { GeneratedQuiz } from '../types';
import { hasUnexpectedForeignLanguage, normalizeArabicGeneratedQuiz, requiresArabicGeneration } from './quizLanguageValidation';

const arabicQuiz: GeneratedQuiz = {
  title: 'اختبار النظام الشمسي',
  description: 'ثلاثة أسئلة للمراجعة',
  questions: [{
    text: 'ما أكبر كوكب في النظام الشمسي؟',
    type: 'mcq',
    options: ['المريخ', 'المشتري'],
    correctIndex: 1,
    correctAnswer: '',
    explanation: 'المشتري أكبر كواكب النظام الشمسي.',
  }],
};

describe('Arabic quiz language validation', () => {
  it('requires Arabic-only content checks for an Arabic topic', () => {
    expect(requiresArabicGeneration('النظام الشمسي')).toBe(true);
    expect(requiresArabicGeneration('Solar system')).toBe(false);
  });

  it('rejects Korean and lowercase foreign-word leakage from a generated explanation', () => {
    const leaked = {
      ...arabicQuiz,
      questions: [{ ...arabicQuiz.questions[0], explanation: 'تكوّن النظام الشمسي قبل 약 4.6 مليار سنة عبر proceso مستمر.' }],
    };
    expect(hasUnexpectedForeignLanguage(leaked)).toBe(true);
    const normalized = normalizeArabicGeneratedQuiz(leaked);
    expect(normalized.questions[0].explanation).toBe('تكوّن النظام الشمسي قبل 4.6 مليار سنة عبر مستمر.');
    expect(hasUnexpectedForeignLanguage(normalized)).toBe(false);
  });

  it('accepts clean Arabic content and scientific uppercase abbreviations', () => {
    const withAcronym = {
      ...arabicQuiz,
      questions: [{ ...arabicQuiz.questions[0], explanation: 'تساعد صور NASA على دراسة الكواكب.' }],
    };
    expect(hasUnexpectedForeignLanguage(withAcronym)).toBe(false);
  });
});
