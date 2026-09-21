import { describe, expect, it } from 'vitest';
import { detectSourceLanguage, sourceLanguageInstruction } from './extractionJobs';

describe('source language quiz generation', () => {
  it('detects Arabic source text', () => {
    expect(detectSourceLanguage('هذا شرح عربي عن ضغط الدم وكيفية الوقاية منه.')).toBe('ar');
    expect(sourceLanguageInstruction('هذا شرح عربي عن ضغط الدم')).toContain('بالعربية');
  });

  it('detects English source text', () => {
    expect(detectSourceLanguage('This is an English explanation about blood pressure and prevention.')).toBe('en');
    expect(sourceLanguageInstruction('This is an English explanation')).toContain('in English');
  });

  it('asks the model to preserve the source language when unclear', () => {
    expect(sourceLanguageInstruction('1234')).toContain('same language');
  });
});
