import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock('../lib/db', () => ({ getQuizzes: vi.fn(), createQuiz: vi.fn(), deleteQuiz: vi.fn(), updateQuiz: vi.fn() }));
vi.mock('../services/openrouterService', () => ({ generateWithOpenRouter: vi.fn() }));

import { validateAndCleanQuiz } from './useQuizzes';

describe('generated quiz coverage metadata', () => {
  it('preserves coverageId while validating generated question shape', () => {
    const quiz = validateAndCleanQuiz({
      title: 'Biology',
      description: 'Coverage plan test',
      questions: [{
        text: 'What does the sodium-potassium pump do?',
        coverageId: 'C07',
        type: 'mcq',
        options: ['Moves ions using ATP', 'Stores DNA'],
        correctIndex: 0,
        explanation: 'It actively transports ions.',
      }],
    });

    expect(quiz.questions[0].coverageId).toBe('C07');
    expect(quiz.questions[0].text).toBe('What does the sodium-potassium pump do?');
  });
});
