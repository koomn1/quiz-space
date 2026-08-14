import { describe, expect, it } from 'vitest';
import { getNotificationGroup, matchesNotificationFilter } from './notificationPresentation';

describe('notification presentation', () => {
  it('groups reward and learning events for the unified centre', () => {
    expect(getNotificationGroup('weekly_task')).toBe('rewards');
    expect(getNotificationGroup('lesson')).toBe('learning');
    expect(getNotificationGroup('maintenance')).toBe('system');
  });

  it('keeps the all filter inclusive and other filters scoped', () => {
    expect(matchesNotificationFilter('weekly_task', 'all')).toBe(true);
    expect(matchesNotificationFilter('weekly_task', 'rewards')).toBe(true);
    expect(matchesNotificationFilter('weekly_task', 'learning')).toBe(false);
  });
});
