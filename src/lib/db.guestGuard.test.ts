import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('./supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc: mocks.rpc },
}));

import { submitQuizAttempt, upsertQuizErrorBankItem } from './db';

describe('guest database guards', () => {
  beforeEach(() => mocks.rpc.mockReset());

  it('routes a guest identity to the anonymous attempt RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'guest-completion-1' }], error: null });

    await expect(submitQuizAttempt('quiz-1', {
      takerId: 'user-guest-X4WP7E',
      takerName: 'زائر #X4WP7E',
      score: 2,
      clientAttemptKey: 'attempt-key-1234567890',
    })).resolves.toEqual([{ id: 'guest-completion-1' }]);

    expect(mocks.rpc).toHaveBeenCalledWith('submit_guest_quiz_attempt', expect.objectContaining({
      p_guest_id: 'user-guest-X4WP7E',
      p_client_attempt_key: 'attempt-key-1234567890',
    }));
    expect(mocks.rpc).not.toHaveBeenCalledWith('submit_quiz_attempt', expect.anything());
  });

  it('does not send a guest identity to the authenticated Error Bank RPC', async () => {
    const result = await upsertQuizErrorBankItem({
      userId: 'user-guest-X4WP7E',
      quizId: 'quiz-1',
      quizTitle: 'Test',
      question: { id: 'q1', text: 'Question', type: 'mcq', options: ['A', 'B'], correctIndex: 0, correctAnswer: 'A' },
      userAnswer: 'B',
      correctAnswer: 'A',
    });

    expect(result).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
