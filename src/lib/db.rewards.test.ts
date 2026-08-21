import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('./supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));

import { activateRewardFrame, addLessonVideo, broadcastPlatformNotification, claimWeeklyTask, deleteLessonVideo, getCurrentWeeklyTasks, getLearningStreakStatus, getRewardLedger, markClassroomAttendance, purchaseRewardItem, recordWebVital, submitQuizAttempt, updateDailyStreak, updateUserNotificationPreferences } from './db';

describe('reward and persistence database helpers', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    vi.unstubAllGlobals();
  });

  it('refreshes shared reward views after the atomic daily quiz reward is recorded', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    vi.stubGlobal('CustomEvent', class {
      type: string;
      constructor(type: string) { this.type = type; }
    });
    mocks.rpc.mockResolvedValueOnce({
      data: [{ id: 'daily-completion-1', points_awarded: 35, total_points: 235, daily_completed: true }],
      error: null,
    });

    await expect(submitQuizAttempt('daily-demo', {
      takerId: 'student-1', takerName: 'Student', score: 3, totalQuestions: 3,
    })).resolves.toEqual([{ id: 'daily-completion-1', points_awarded: 35, total_points: 235, daily_completed: true }]);

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'submit_user_daily_quiz_attempt', expect.objectContaining({ p_quiz_id: 'daily-demo' }));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalledWith('award_quiz_completion_rewards', expect.anything());
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'quizspace-rewards-updated' }));
  });

  it('does not refresh reward views when the atomic daily completion fails', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    vi.stubGlobal('CustomEvent', class {
      type: string;
      constructor(type: string) { this.type = type; }
    });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('Daily quiz is unavailable') });

    await expect(submitQuizAttempt('daily-demo', {
      takerId: 'student-1', takerName: 'Student', score: 3, totalQuestions: 3,
    })).rejects.toThrow('Daily quiz is unavailable');

    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('activates a frame only through the ownership-verifying RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true, active_frame_id: 'frame-gold' }, error: null });

    await expect(activateRewardFrame('frame-gold')).resolves.toEqual({ success: true, active_frame_id: 'frame-gold' });
    expect(mocks.rpc).toHaveBeenCalledWith('activate_reward_frame', { p_item_id: 'frame-gold' });
  });

  it('reads the learning streak only from the authenticated server context', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        current_streak: 4,
        longest_streak: 8,
        protection_days: 1,
        checked_in_today: true,
        last_login_date: '2026-08-14',
      },
      error: null,
    });

    await expect(getLearningStreakStatus()).resolves.toMatchObject({
      currentStreak: 4,
      longestStreak: 8,
      protectionDays: 1,
      checkedInToday: true,
    });
    expect(mocks.rpc).toHaveBeenCalledWith('get_learning_streak_status');
  });

  it('updates the learning streak through an identity-bound RPC without a client user id', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true, streak: 4, points: 20 }, error: null });

    await expect(updateDailyStreak()).resolves.toEqual({ success: true, streak: 4, points: 20 });
    expect(mocks.rpc).toHaveBeenCalledWith('update_daily_streak');
  });

  it('purchases a store item only through the server-side purchase RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true, points_remaining: 120 }, error: null });

    await expect(purchaseRewardItem('frame-gold')).resolves.toEqual({ success: true, points_remaining: 120 });
    expect(mocks.rpc).toHaveBeenCalledWith('purchase_reward_item', { p_item_id: 'frame-gold' });
  });

  it('persists notification preferences using a user-scoped upsert key', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert });

    await updateUserNotificationPreferences('student-1', {
      emailAlerts: false,
      rankUpdates: true,
      weeklyReports: true,
      pushEnabled: false,
    });

    expect(mocks.from).toHaveBeenCalledWith('user_notification_preferences');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'student-1',
      email_alerts: false,
      rank_updates: true,
      weekly_reports: true,
      push_enabled: false,
    }), { onConflict: 'user_id' });
  });

  it('reads a bounded, user-scoped page of reward history', async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({
      id: `ledger-${index}`, points: 10, event_type: 'quiz_completion', event_key: `quiz:${index}`,
      reference_id: `quiz-${index}`, metadata: {}, created_at: '2026-08-14T00:00:00Z',
    }));
    const range = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn().mockReturnValue({ range });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    const page = await getRewardLedger('student-1', 20, 2);

    expect(eq).toHaveBeenCalledWith('user_id', 'student-1');
    expect(range).toHaveBeenCalledWith(20, 22);
    expect(page.entries).toHaveLength(2);
    expect(page.hasMore).toBe(true);
  });

  it('maps server-evaluated weekly task state without trusting client progress', async () => {
    mocks.rpc.mockResolvedValue({ data: [{
      id: 'weekly_complete_three', name: 'Three quizzes', name_ar: 'أكمل ثلاثة اختبارات',
      description: 'Complete three quizzes.', description_ar: 'أكمل ثلاثة اختبارات.',
      event_type: 'quiz_completion', target: 3, points_reward: 75, coins_reward: 10,
      icon: 'book-open', sort_order: 1, progress: 2, completed_at: null, claimed_at: null,
    }], error: null });

    await expect(getCurrentWeeklyTasks()).resolves.toEqual([expect.objectContaining({
      id: 'weekly_complete_three', target: 3, progress: 2, pointsReward: 75, coinsReward: 10,
    })]);
    expect(mocks.rpc).toHaveBeenCalledWith('get_current_weekly_tasks');
  });

  it('claims a completed weekly task through the secure server-side RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: { claimed: true, points: 75, coins: 10, total_points: 230 }, error: null });

    await expect(claimWeeklyTask('weekly_complete_three')).resolves.toEqual({
      claimed: true, reason: undefined, points: 75, coins: 10, totalPoints: 230,
    });
    expect(mocks.rpc).toHaveBeenCalledWith('claim_weekly_task', { p_task_id: 'weekly_complete_three' });
  });

  it('broadcasts administrator updates through the server-authorized RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: 18, error: null });

    await expect(broadcastPlatformNotification('Maintenance', 'The platform will be updated tonight.')).resolves.toBe(18);
    expect(mocks.rpc).toHaveBeenCalledWith('broadcast_platform_notification', {
      p_title: 'Maintenance',
      p_body: 'The platform will be updated tonight.',
    });
  });

  it('records bounded Web Vitals through the authenticated telemetry RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    await expect(recordWebVital('lcp', 1250.5, '/quiz-space/', 'mobile')).resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith('record_web_vital', {
      p_metric_name: 'lcp',
      p_metric_value: 1250.5,
      p_path: '/quiz-space/',
      p_device_class: 'mobile',
    });
  });

  it('returns a normalized classroom lesson after a successful insert', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'lesson-1', class_id: 'class-1', creator_id: 'teacher-1', creator_name: 'Teacher',
        title: 'Revision session', description: null, video_url: 'https://youtu.be/abcdefghijk',
        video_type: 'youtube', is_live: false, is_pinned: false, view_count: 0, created_at: '2026-08-14T00:00:00Z',
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mocks.from.mockReturnValue({ insert });

    await expect(addLessonVideo({
      classId: 'class-1', creatorId: 'teacher-1', creatorName: 'Teacher',
      title: 'Revision session', videoUrl: 'https://youtu.be/abcdefghijk',
    })).resolves.toMatchObject({
      id: 'lesson-1', classId: 'class-1', creatorId: 'teacher-1', title: 'Revision session',
    });
  });

  it('rejects lesson creation when Supabase does not return a saved record', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mocks.from.mockReturnValue({ insert });

    await expect(addLessonVideo({
      classId: 'class-1', creatorId: 'teacher-1', creatorName: 'Teacher',
      title: 'Revision session', videoUrl: 'https://youtu.be/abcdefghijk',
    })).rejects.toThrow('did not return a saved record');
  });

  it('rejects lesson deletion when Supabase deletes no row', async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const classFilter = vi.fn().mockReturnValue({ select });
    const lessonFilter = vi.fn().mockReturnValue({ eq: classFilter });
    const remove = vi.fn().mockReturnValue({ eq: lessonFilter });
    mocks.from.mockReturnValue({ delete: remove });

    await expect(deleteLessonVideo('lesson-1', 'class-1')).rejects.toThrow('not found or cannot be deleted');
  });

  it('uses the identity-bound attendance RPC and normalizes its saved record', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        id: 'attendance-1', class_id: 'class-1', student_id: 'student-1', attendance_date: '2026-08-21',
        status: 'present', marked_by: 'teacher-1', marked_at: '2026-08-21T08:30:00.000Z', note: null,
        created_at: '2026-08-21T08:30:00.000Z', updated_at: '2026-08-21T08:30:00.000Z',
      }],
      error: null,
    });

    await expect(markClassroomAttendance({
      classId: ' class-1 ', studentId: ' student-1 ', attendanceDate: '2026-08-21', status: 'present',
    })).resolves.toMatchObject({
      id: 'attendance-1', classId: 'class-1', studentId: 'student-1', status: 'present',
    });

    expect(mocks.rpc).toHaveBeenCalledWith('mark_classroom_attendance', {
      p_class_id: 'class-1',
      p_student_id: 'student-1',
      p_attendance_date: '2026-08-21',
      p_status: 'present',
      p_note: null,
    });
  });
});
