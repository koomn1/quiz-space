import { describe, expect, it } from 'vitest';
import { extractQuestionsFromText, parseLiteralQuestions } from './documentExtraction';

describe('literal document question extraction', () => {
  it('parses dash and bullet options instead of silently turning them into essay text', () => {
    const questions = parseLiteralQuestions([
      '1. ما ناتج جمع ٢ و٣؟',
      '- ٤',
      '- ٥',
      '- ٦',
      'Answer: B',
      'سؤال ٢: ما لون السماء؟',
      'أ) أزرق',
      'ب) أخضر',
      'ج) أحمر',
      'د) أصفر',
      'Answer: أ',
    ].join('\n'));

    expect(questions).toHaveLength(2);
    expect(questions[0].type).toBe('mcq');
    expect(questions[0].options).toEqual(['٤', '٥', '٦']);
    expect(questions[0].correctIndex).toBe(1);
    expect(questions[1].type).toBe('mcq');
    expect(questions[1].options).toEqual(['أزرق', 'أخضر', 'أحمر', 'أصفر']);
    expect(questions[1].correctIndex).toBe(0);
  });

  it('preserves wrapped option text and every question occurrence, including identical questions', async () => {
    const repeated = [
      '1. Which value is correct?',
      'A. The first option continues',
      'on the next line',
      'B. The second option',
      '2. Which value is correct?',
      'A. The first option continues',
      'on the next line',
      'B. The second option',
    ].join('\n');

    const parsed = parseLiteralQuestions(repeated);
    expect(parsed[0].options[0]).toBe('The first option continues on the next line');

    const result = await extractQuestionsFromText(repeated, {} as any);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].text).toBe(result.questions[1].text);
  });

  it('skips numbered MCQ section headings and resolves answer keys with dash labels', async () => {
    const source = [
      '1. GENERAL MANAGEMENT (MCQ)',
      '1- What is the red planet?',
      'a- Earth',
      'b- Mars',
      'c- Venus',
      'd- Jupiter',
      'Answer: b- Mars',
      'الشرح: نص توضيحي لا ينتمي إلى الاختيار الأخير.',
      '2. HORSE MANAGEMENT (MCQ)',
      '1- Which animal is a foal?',
      'a- Young horse',
      'b- Adult cow',
      'Answer: a- Young horse',
    ].join('\n');

    const questions = parseLiteralQuestions(source);
    expect(questions).toHaveLength(2);
    expect(questions.map(question => question.text)).toEqual(['What is the red planet?', 'Which animal is a foal?']);
    expect(questions.map(question => question.correctIndex)).toEqual([1, 0]);
    expect(questions[0].options).toEqual(['Earth', 'Mars', 'Venus', 'Jupiter']);

    const result = await extractQuestionsFromText(source, {} as any);
    expect(result.questions).toHaveLength(2);
    expect(result.provider).toBe('local-format-parser');
    expect(result.questions.every(question => question.correctIndex >= 0)).toBe(true);
  });
});
