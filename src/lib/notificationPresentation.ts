export type NotificationGroup = 'all' | 'rewards' | 'learning' | 'system';

const rewardTypes = new Set(['weekly_task', 'daily_challenge', 'daily_gift', 'lucky_spin', 'daily_reward', 'mystery_box', 'brain_challenge', 'admin_grant', 'reward', 'store_purchase']);
const learningTypes = new Set(['classroom', 'lesson', 'assignment', 'quiz', 'community', 'daily_learning']);

export function getNotificationGroup(type?: string | null): Exclude<NotificationGroup, 'all'> {
  const normalized = String(type || '').toLowerCase();
  if (rewardTypes.has(normalized)) return 'rewards';
  if (learningTypes.has(normalized)) return 'learning';
  return 'system';
}

export function matchesNotificationFilter(type: string | null | undefined, filter: NotificationGroup): boolean {
  return filter === 'all' || getNotificationGroup(type) === filter;
}
