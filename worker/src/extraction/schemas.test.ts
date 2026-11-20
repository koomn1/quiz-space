import { describe, expect, it } from 'vitest';
import {
  applyRequestedQuestionCount,
  deriveQuizTitle,
  isGenericQuizTitle,
  normalizeAnswerText,
  normalizeQuestions,
  normalizeTrueFalseOptions,
  questionFingerprint,
  resolveCorrectIndex,
  sourceFileBaseName,
  validateGeneratedQuestions,
} from './schemas';
import { extractBalancedJson, parseJson } from './aiPipeline';

describe('worker/src/extraction/schemas: Normalization & Parsing', () => {
  describe('extractBalancedJson & parseJson', () => {
    it('extracts balanced JSON objects and arrays from text', () => {
      const text = 'Some preamble {"key": "value", "list": [1, 2, {"nested": true}]} extra text';
      const extracted = extractBalancedJson(text, text.indexOf('{'));
      expect(extracted).toBe('{"key": "value", "list": [1, 2, {"nested": true}]}');
      expect(JSON.parse(extracted!)).toEqual({ key: 'value', list: [1, 2, { nested: true }] });
    });

    it('returns null on unclosed brackets or strings', () => {
      expect(extractBalancedJson('{"unclosed": [1, 2}', 0)).toBeNull();
      expect(extractBalancedJson('not json', 0)).toBeNull();
    });

    it('parses markdown fenced json blocks correctly', () => {
      const fenced = '```json\n{"questions": [{"text": "Q1"}]}\n```';
      expect(parseJson(fenced)).toEqual({ questions: [{ text: 'Q1' }] });
    });

    it('repairs trailing commas in JSON objects and arrays', () => {
      const trailingCommaJson = 'Leading note {"title": "Test", "questions": [{"number": 1,},],} trailing note';
      const parsed = parseJson(trailingCommaJson);
      expect(parsed.title).toBe('Test');
      expect(parsed.questions).toHaveLength(1);
    });

    it('throws when no valid JSON is found', () => {
      expect(() => parseJson('Just plain unstructured chat text')).toThrow('AI returned invalid JSON.');
    });
  });

  describe('normalizeAnswerText', () => {
    it('normalizes diacritics, punctuation, spacing, and casing', () => {
      expect(normalizeAnswerText('  سُؤَالٌ!  ')).toBe('سؤال');
      expect(normalizeAnswerText('Option (A): TRUE.')).toBe('option a true');
      expect(normalizeAnswerText('   Multiple   Spaces   ')).toBe('multiple spaces');
    });
  });

  describe('normalizeTrueFalseOptions', () => {
    it('harmonizes options to Latin True/False when question is Latin and options are Arabic', () => {
      expect(normalizeTrueFalseOptions('Is the earth round?', ['صح', 'خطأ'])).toEqual(['True', 'False']);
    });

    it('harmonizes options to Arabic صح/خطأ when question is Arabic and options are Latin', () => {
      expect(normalizeTrueFalseOptions('هل الأرض كروية؟', ['True', 'False'])).toEqual(['صح', 'خطأ']);
    });

    it('preserves matching language options', () => {
      expect(normalizeTrueFalseOptions('هل الأرض كروية؟', ['صح', 'خطأ'])).toEqual(['صح', 'خطأ']);
      expect(normalizeTrueFalseOptions('Is earth round?', ['True', 'False'])).toEqual(['True', 'False']);
    });
  });

  describe('resolveCorrectIndex', () => {
    const options = ['Paris', 'London', 'Berlin', 'Madrid'];

    it('uses valid numeric correctIndex if within bounds', () => {
      expect(resolveCorrectIndex({ correctIndex: 2 }, options, 'mcq')).toBe(2);
    });

    it('resolves correctIndex from correctAnswer text match', () => {
      expect(resolveCorrectIndex({ correctAnswer: 'London' }, options, 'mcq')).toBe(1);
      expect(resolveCorrectIndex({ correctAnswer: '  berlin. ' }, options, 'mcq')).toBe(2);
    });

    it('resolves True/False index from boolean words', () => {
      const tfOptions = ['True', 'False'];
      expect(resolveCorrectIndex({ correctAnswer: 'yes' }, tfOptions, 'tf')).toBe(0);
      expect(resolveCorrectIndex({ correctAnswer: 'صحيح' }, tfOptions, 'tf')).toBe(0);
      expect(resolveCorrectIndex({ correctAnswer: 'no' }, tfOptions, 'tf')).toBe(1);
      expect(resolveCorrectIndex({ correctAnswer: 'خطأ' }, tfOptions, 'tf')).toBe(1);
    });

    it('returns -1 when no index or matching answer is found', () => {
      expect(resolveCorrectIndex({ correctAnswer: 'Tokyo' }, options, 'mcq')).toBe(-1);
      expect(resolveCorrectIndex({}, options, 'mcq')).toBe(-1);
    });
  });

  describe('normalizeQuestions', () => {
    it('extracts questions from diverse container keys (questions, items, data, quiz.questions)', () => {
      const raw1 = { questions: [{ text: 'Q1', options: ['A', 'B'], correctIndex: 0 }] };
      const raw2 = { items: [{ prompt: 'Q2', choices: ['C', 'D'], correctIndex: 1 }] };
      const raw3 = { data: [{ questionText: 'Q3', type: 'essay' }] };
      const raw4 = { quiz: { questions: [{ question: 'Q4', kind: 'tf', options: ['True', 'False'], correctIndex: 0 }] } };

      expect(normalizeQuestions(raw1)).toHaveLength(1);
      expect(normalizeQuestions(raw2)).toHaveLength(1);
      expect(normalizeQuestions(raw3)).toHaveLength(1);
      expect(normalizeQuestions(raw4)).toHaveLength(1);
    });

    it('deduplicates identical question texts', () => {
      const duplicateList = [
        { text: 'What is biology?', options: ['A', 'B'], correctIndex: 0 },
        { text: '  What is biology?  ', options: ['A', 'B'], correctIndex: 0 },
      ];
      expect(normalizeQuestions(duplicateList)).toHaveLength(1);
    });

    it('filters questions by allowedTypes', () => {
      const mixed = [
        { text: 'Q1 MCQ', type: 'mcq', options: ['A', 'B'], correctIndex: 0 },
        { text: 'Q2 Essay', type: 'essay' },
        { text: 'Q3 TF', type: 'tf', options: ['True', 'False'], correctIndex: 0 },
      ];
      expect(normalizeQuestions(mixed, ['mcq'])).toHaveLength(1);
      expect(normalizeQuestions(mixed, ['essay'])).toHaveLength(1);
      expect(normalizeQuestions(mixed, ['mcq', 'tf'])).toHaveLength(2);
    });

    it('enforces empty options and -1 correctIndex on essay questions', () => {
      const essay = [{ text: 'Write an essay about AI', type: 'essay', options: ['A', 'B'], correctIndex: 0 }];
      const normalized = normalizeQuestions(essay);
      expect(normalized[0].options).toEqual([]);
      expect(normalized[0].correctIndex).toBe(-1);
    });
  });

  describe('validateGeneratedQuestions', () => {
    it('accepts valid MCQ and essay questions', () => {
      const valid = [
        { text: 'What is 2+2?', type: 'mcq', options: ['3', '4'], correctIndex: 1, correctAnswer: '4' },
        { text: 'Explain gravity', type: 'essay' },
      ];
      expect(validateGeneratedQuestions(valid)).toHaveLength(2);
    });

    it('rejects MCQ questions with mismatched correctAnswer and options[correctIndex]', () => {
      const invalid = [
        { text: 'What is 2+2?', type: 'mcq', options: ['3', '4'], correctIndex: 1, correctAnswer: '3' },
      ];
      expect(validateGeneratedQuestions(invalid)).toHaveLength(0);
    });

    it('rejects MCQ questions with fewer than 2 options or out-of-bounds correctIndex', () => {
      expect(validateGeneratedQuestions([{ text: 'Q', type: 'mcq', options: ['Only One'], correctIndex: 0, correctAnswer: 'Only One' }])).toHaveLength(0);
      expect(validateGeneratedQuestions([{ text: 'Q', type: 'mcq', options: ['A', 'B'], correctIndex: 5, correctAnswer: 'A' }])).toHaveLength(0);
      expect(validateGeneratedQuestions([{ text: 'Q', type: 'mcq', options: ['A', 'B'], correctIndex: -1, correctAnswer: 'A' }])).toHaveLength(0);
    });
  });

  describe('questionFingerprint', () => {
    it('produces deterministic 8-hex-character hash based on question text and options', () => {
      const q1 = { text: 'What is photosynthesis?', options: ['Process in plants', 'Animal digestion'] };
      const q2 = { text: 'what is photosynthesis? ', options: ['process in plants', 'animal digestion'] };
      const fp1 = questionFingerprint(q1);
      const fp2 = questionFingerprint(q2);
      expect(fp1).toBe(fp2);
      expect(fp1).toMatch(/^[0-9a-f]{8}$/);
    });

    it('produces different hashes for different questions', () => {
      const fp1 = questionFingerprint({ text: 'Question 1', options: ['A', 'B'] });
      const fp2 = questionFingerprint({ text: 'Question 2', options: ['A', 'B'] });
      expect(fp1).not.toBe(fp2);
    });
  });

  describe('deriveQuizTitle & isGenericQuizTitle', () => {
    it('derives title from first prominent heading in document text', () => {
      const text = '\nAdvanced Organic Chemistry\n\n1. What is an alkane?\nA. A\nB. B';
      expect(deriveQuizTitle('lecture_notes.pdf', text)).toBe('Advanced Organic Chemistry');
    });

    it('falls back to cleaned source file base name when no heading exists', () => {
      const text = '1. What is 2+2?\nA. 3\nB. 4';
      expect(deriveQuizTitle('Medical_Genetics_Final_Exam.pdf', text)).toBe('Medical Genetics Final Exam');
    });

    it('identifies known generic titles', () => {
      expect(isGenericQuizTitle('Extracted Quiz')).toBe(true);
      expect(isGenericQuizTitle('اختبار مستخرج')).toBe(true);
      expect(isGenericQuizTitle('اختبار مستخرج من الملف')).toBe(true);
      expect(isGenericQuizTitle('')).toBe(true);
      expect(isGenericQuizTitle('Cell Biology Exam')).toBe(false);
    });

    it('cleans sourceFileBaseName correctly', () => {
      expect(sourceFileBaseName('uploads/biology-ch1.v2.docx')).toBe('biology ch1 v2');
      expect(sourceFileBaseName(null)).toBe('');
    });
  });

  describe('applyRequestedQuestionCount', () => {
    it('does not truncate questions for generate mode or literal mode', () => {
      const questions = [{ text: 'Q1' }, { text: 'Q2' }, { text: 'Q3' }];
      expect(applyRequestedQuestionCount(questions, 'literal', 1)).toHaveLength(3);
      expect(applyRequestedQuestionCount(questions, 'generate', 1)).toHaveLength(3);
    });
  });
});
