import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('./supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
    auth: { getUser: mocks.getUser },
  },
}));

import { getUserRatedQuestions, rateQuestion, updateCompletionReview } from './db';

describe('question and quiz rating persistence', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.getUser.mockReset();
  });

  it('uses the authenticated UID and a quiz-scoped conflict key', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
    mocks.from.mockReturnValue({ upsert });

    await rateQuestion('stale-profile-id', 'quiz-42', 'Biology', 'q-0', 'What is osmosis?', 'like');

    expect(mocks.from).toHaveBeenCalledWith('question_ratings');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'auth-user-1_quiz-42_q-0',
      user_id: 'auth-user-1',
      quiz_id: 'quiz-42',
      question_id: 'q-0',
      rating_value: 'like',
    }), { onConflict: 'user_id,quiz_id,question_id' });
  });

  it('rejects if there is no authenticated session instead of pretending to save', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(rateQuestion('student-1', 'quiz-42', 'Biology', 'q-0', 'Question', 'dislike'))
      .rejects.toThrow('Sign in before rating a question.');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('propagates a rejected Supabase upsert to the UI', async () => {
    const databaseError = Object.assign(new Error('row-level security policy denied'), { code: '42501' });
    const upsert = vi.fn().mockResolvedValue({ error: databaseError });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
    mocks.from.mockReturnValue({ upsert });

    await expect(rateQuestion('auth-user-1', 'quiz-42', 'Biology', 'q-0', 'Question', 'dislike'))
      .rejects.toBe(databaseError);
  });

  it('maps persisted snake_case rows to the UI QuestionRating shape', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [{
      id: 'rating-1', user_id: 'auth-user-1', quiz_id: 'quiz-42', quiz_title: 'Biology',
      question_id: 'q-0', question_text: 'Question', rating_value: 'dislike', created_at: '2026-10-27T00:00:00Z',
    }], error: null });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });

    await expect(getUserRatedQuestions('stale-profile-id')).resolves.toEqual([{
      id: 'rating-1', userId: 'auth-user-1', quizId: 'quiz-42', quizTitle: 'Biology',
      questionId: 'q-0', questionText: 'Question', ratingValue: 'dislike', createdAt: '2026-10-27T00:00:00Z',
    }]);
    expect(select).toHaveBeenCalledWith('id,user_id,quiz_id,quiz_title,question_id,question_text,rating_value,created_at');
    expect(eq).toHaveBeenCalledWith('user_id', 'auth-user-1');
  });

  it('does not accept a false RPC result as a successfully saved quiz rating', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });

    await expect(updateCompletionReview('completion-1', 5, 'Great'))
      .rejects.toThrow('تعذر تأكيد حفظ تقييم الاختبار. حاول مرة أخرى.');
    expect(mocks.rpc).toHaveBeenCalledWith('update_completion_review', {
      p_completion_id: 'completion-1', p_rating: 5, p_feedback: 'Great',
    });
  });

  it('accepts an explicit true confirmation from the quiz rating RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    await expect(updateCompletionReview('completion-1', 4, 'Useful')).resolves.toBeUndefined();
  });
});
