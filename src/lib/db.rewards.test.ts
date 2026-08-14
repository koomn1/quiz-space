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

import { activateRewardFrame, addLessonVideo, broadcastPlatformNotification, claimWeeklyTask, getCurrentWeeklyTasks, getRewardLedger, purchaseRewardItem, recordWebVital, updateUserNotificationPreferences } from './db';

describe('reward and persistence database helpers', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
  });

  it('activates a frame only through the ownership-verifying RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true, active_frame_id: 'frame-gold' }, error: null });

    await expect(activateRewardFrame('frame-gold')).resolves.toEqual({ success: true, active_frame_id: 'frame-gold' });
    expect(mocks.rpc).toHaveBeenCalledWith('activate_reward_frame', { p_item_id: 'frame-gold' });
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
});
