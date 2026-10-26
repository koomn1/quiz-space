import { describe, expect, it } from 'vitest';
import { COSMO_QUIZ_MAX_COUNT, COSMO_QUIZ_MIN_COUNT, parseAutomaticQuestionCount, parseExplicitQuestionCount } from './cosmoQuizCount';

describe('Cosmo automatic quiz count', () => {
  it('keeps an omitted count in automatic mode', () => {
    expect(parseExplicitQuestionCount('أنشئ اختبارًا في الأحياء')).toBeNull();
  });

  it('parses explicit Arabic and Western numerals while respecting the UI bounds', () => {
    expect(parseExplicitQuestionCount('اعمل اختبار ١٢ سؤال')).toBe(12);
    expect(parseExplicitQuestionCount('create a quiz with 42 questions')).toBe(42);
    expect(parseExplicitQuestionCount('create 999 questions')).toBe(COSMO_QUIZ_MAX_COUNT);
    expect(parseExplicitQuestionCount('create 1 question')).toBe(COSMO_QUIZ_MIN_COUNT);
  });

  it('accepts only a valid model-selected amount', () => {
    expect(parseAutomaticQuestionCount('{"amount": 47}')).toBe(47);
    expect(parseAutomaticQuestionCount('23')).toBe(23);
    expect(parseAutomaticQuestionCount('{"amount": 0}')).toBeNull();
    expect(parseAutomaticQuestionCount('{"amount": 101}')).toBeNull();
    expect(parseAutomaticQuestionCount('about thirty questions')).toBeNull();
  });
});
