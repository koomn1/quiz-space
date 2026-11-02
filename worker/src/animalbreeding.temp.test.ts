import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { extractPdfTextContent, parseLiteralQuestions, isReliableLiteralExtraction, extractTableQuestionsFromPdf } from './documentExtraction';

describe('Animal breeding fixture', () => {
  it('rebuilds wrapped table rows without collapsing numbered questions', async () => {
    const bytes = await readFile('/home/ubuntu/upload/ANIMALBREEDING_QuestionsBank_2026_summerized.pdf');
    const text = await extractPdfTextContent(new Uint8Array(bytes));
    const questions = parseLiteralQuestions(text);
    const tableQuestions = await extractTableQuestionsFromPdf(new Uint8Array(bytes));
    expect(text.length).toBeGreaterThan(1000);
    expect(isReliableLiteralExtraction(text, questions)).toBe(true);
    expect(tableQuestions.length).toBeGreaterThan(250);
    expect(tableQuestions.map(question => question.number)).toEqual(expect.arrayContaining([1, 2]));
    expect(Math.max(...tableQuestions.map(question => question.number || 0))).toBeGreaterThanOrEqual(300);
    expect(tableQuestions.every(question => question.options.length >= 2 && question.correctIndex >= 0)).toBe(true);
  }, 60_000);
});
