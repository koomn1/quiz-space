import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Flutter mobile quiz scoring contract', () => {
  const edge = readFileSync(
    resolve(process.cwd(), 'supabase/functions/mobile-firebase-session-v2/index.ts'),
    'utf8',
  );

  it('derives mobile scores from stored quiz answer indexes', () => {
    expect(edge).toContain('rawAnswers.length !== questions.length');
    expect(edge).toContain('const storedCorrectIndex = question.correctIndex;');
    expect(edge).toContain('correct = options[storedCorrectIndex];');
    expect(edge).toContain('if (correct && answer && correct === answer) score += 1;');
    expect(edge).toContain('p_score: score');
  });
});
