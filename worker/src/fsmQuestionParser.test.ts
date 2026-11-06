import { describe, expect, it } from 'vitest';
import { FsmQuestionParser, linkGlobalAnswerKeys } from './fsmQuestionParser';

const line = (text: string, pageNumber = 1) => ({ text, pageNumber });

describe('FSM question parser', () => {
  it('keeps wrapped stems and options across pages', () => {
    const result = FsmQuestionParser.parseLines([
      line('MCQ'),
      line('15- Which animal has a question stem that', 7),
      line('continues on the next page?', 7),
      line('A- First option', 7),
      line('continues here', 8),
      line('B- Second option', 8),
      line('C- Third option', 8),
      line('D- Fourth option', 8),
      line('Page 8 of 12', 8),
    ]);

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].rawNumber).toBe('15');
    expect(result.questions[0].stem).toContain('continues on the next page?');
    expect(result.questions[0].options[0].text).toBe('First option continues here');
    expect(result.questions[0].sourcePages).toEqual([7, 8]);
  });

  it('splits inline options and extracts explicit answers', () => {
    const result = FsmQuestionParser.parseLines([
      line('1- Choose the correct answer'),
      line('A- Alpha | B- Beta | C- Gamma | D- Delta'),
      line('Answer: C'),
    ]);

    expect(result.questions[0].options.map(option => option.text)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(result.questions[0].correctAnswer).toBe('c- Gamma');
    expect(result.questions[0].options[2].isCorrect).toBe(true);
  });

  it('collects a global answer key and links it by section before number-only fallback', () => {
    const parsed = FsmQuestionParser.parseLines([
      line('Biology MCQ'),
      line('1- First question'),
      line('A- Alpha'),
      line('B- Beta'),
      line('C- Gamma'),
      line('D- Delta'),
      line('Answer Key'),
      line('1-C'),
    ]);

    const linked = linkGlobalAnswerKeys(parsed.questions, parsed.answerKeyEntries);
    expect(parsed.answerKeyEntries).toHaveLength(1);
    expect(linked[0].correctAnswer).toBe('c- Gamma');
    expect(linked[0].options[2].visualCue).toBe('answer_key');
  });
});
