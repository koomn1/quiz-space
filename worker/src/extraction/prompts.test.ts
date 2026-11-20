import { describe, expect, it } from 'vitest';
import {
  allowedQuestionTypesInstruction,
  detectQuestionBank,
  detectSourceLanguage,
  documentVisionPrompt,
  extractionPrompt,
  generatePrompt,
  parseAllowedQuestionTypes,
  sourceLanguageInstruction,
} from './prompts';
import type { ExtractionJobRow } from './types';

describe('worker/src/extraction/prompts: Prompt Generation & Heuristics', () => {
  describe('detectSourceLanguage & sourceLanguageInstruction', () => {
    it('detects Arabic when Arabic characters predominate', () => {
      const arabicText = 'هذا نص باللغة العربية لاختبار استخراج الأسئلة من الملفات التعليمية.';
      expect(detectSourceLanguage(arabicText)).toBe('ar');
      expect(sourceLanguageInstruction(arabicText)).toContain('اكتب العنوان والوصف وجميع الأسئلة');
    });

    it('detects English when Latin characters predominate', () => {
      const englishText = 'This is a sample text in English designed to test question extraction from medical books.';
      expect(detectSourceLanguage(englishText)).toBe('en');
      expect(sourceLanguageInstruction(englishText)).toContain('Write the title, description, questions');
    });

    it('falls back to unknown on sparse or empty text', () => {
      expect(detectSourceLanguage('12345 67890')).toBe('unknown');
      expect(sourceLanguageInstruction('12345 67890')).toContain('Detect the dominant language of the source');
    });
  });

  describe('detectQuestionBank', () => {
    it('identifies question bank when numbering signals >= 20', () => {
      const bankLines = Array.from({ length: 25 }, (_, i) => `${i + 1} What is the answer?`).join('\n');
      const result = detectQuestionBank(bankLines);
      expect(result.isQuestionBank).toBe(true);
      expect(result.numberedQuestions).toBeGreaterThanOrEqual(25);
    });

    it('identifies question bank when highest question number >= 50', () => {
      const text = '55 Which of the following is correct?\nA. Alpha\nB. Beta';
      const result = detectQuestionBank(text);
      expect(result.isQuestionBank).toBe(true);
      expect(result.numberedQuestions).toBeGreaterThanOrEqual(55);
    });

    it('returns false for ordinary lecture notes with low numbering signals', () => {
      const text = 'Introduction to Anatomy\nSection 1 overview.\nSection 2 details.\nSection 3 summary.';
      const result = detectQuestionBank(text);
      expect(result.isQuestionBank).toBe(false);
      expect(result.numberedQuestions).toBe(0);
    });
  });

  describe('parseAllowedQuestionTypes & allowedQuestionTypesInstruction', () => {
    it('defaults to all types when no marker is present', () => {
      expect(parseAllowedQuestionTypes(null)).toEqual(['mcq', 'tf', 'essay']);
      expect(parseAllowedQuestionTypes('')).toEqual(['mcq', 'tf', 'essay']);
      expect(parseAllowedQuestionTypes('General instruction')).toEqual(['mcq', 'tf', 'essay']);
    });

    it('parses types from [QUESTION_TYPES_ALLOWED: ...] marker', () => {
      expect(parseAllowedQuestionTypes('[QUESTION_TYPES_ALLOWED: mcq]')).toEqual(['mcq']);
      expect(parseAllowedQuestionTypes('[QUESTION_TYPES_ALLOWED: tf, essay]')).toEqual(['tf', 'essay']);
      expect(parseAllowedQuestionTypes('[QUESTION_TYPES_ALLOWED: mcq+tf]')).toEqual(['mcq', 'tf']);
    });

    it('formats instruction text with allowed labels', () => {
      const instruction = allowedQuestionTypesInstruction('[QUESTION_TYPES_ALLOWED: mcq, tf]');
      expect(instruction).toContain('multiple choice (mcq)');
      expect(instruction).toContain('true/false (tf)');
      expect(instruction).not.toContain('written/essay (essay)');
    });
  });

  describe('extractionPrompt & generatePrompt', () => {
    it('includes schema, language, and type instructions in extractionPrompt', () => {
      const prompt = extractionPrompt('[QUESTION_TYPES_ALLOWED: mcq]', 'Some English source text');
      expect(prompt).toContain('lossless document extraction engine');
      expect(prompt).toContain('Write the title, description, questions');
      expect(prompt).toContain('Allowed output types are ONLY: multiple choice (mcq)');
      expect(prompt).toContain('"questions": [');
    });

    it('adjusts generatePrompt for question bank vs lecture notes', () => {
      const bankText = Array.from({ length: 30 }, (_, i) => `${i + 1} Question text`).join('\n');
      const bankPrompt = generatePrompt(null, null, bankText);
      expect(bankPrompt).toContain('هذا الجزء من بنك أسئلة مرقّم');

      const notesText = 'Lecture notes on physiology without any questions';
      const notesPrompt = generatePrompt(10, null, notesText);
      expect(notesPrompt).toContain('استخرج أو أنشئ 10 سؤالاً بدقة متناهية');
    });
  });

  describe('documentVisionPrompt', () => {
    const baseJob: ExtractionJobRow = {
      id: 'job-1',
      user_id: 'user-1',
      idempotency_key: 'key-1234567890123456',
      file_storage_path: 'user-1/uploads/test.pdf',
      file_mime_type: 'application/pdf',
      source_file_name: 'test.pdf',
      extraction_mode: 'literal',
      custom_instruction: null,
      requested_question_count: null,
      status: 'pending',
      processing_token: null,
      processing_lease_expires_at: null,
      progress_percentage: 0,
      progress_message: null,
      processed_chunks: 0,
      total_chunks: 0,
      questions_json: null,
      quiz_title: null,
      quiz_description: null,
      provider: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('generates vision prompt for literal extraction mode', () => {
      const prompt = documentVisionPrompt(baseJob);
      expect(prompt).toContain('The attached page image is the source of truth for language');
      expect(prompt).toContain('lossless document extraction engine');
    });

    it('generates vision prompt for generate extraction mode', () => {
      const prompt = documentVisionPrompt({ ...baseJob, extraction_mode: 'generate' });
      expect(prompt).toContain('اقرأ الصفحات المرفقة بدقة وتعمق');
      expect(prompt).toContain('IMPORTANT: detect the dominant language from the attached page itself');
    });
  });
});
