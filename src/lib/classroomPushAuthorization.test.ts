import { describe, expect, it } from 'vitest';
import { canBroadcastClassroomPush } from '../../supabase/functions/_shared/classroomPushAuthorization';

describe('classroom push broadcast authorization', () => {
  const base = {
    userId: 'student-1',
    classroomOwnerId: 'teacher-1',
    membershipRole: null as string | null,
    isAdmin: false,
    isCron: false,
  };

  it('rejects ordinary students even when they are class members', () => {
    expect(canBroadcastClassroomPush(base)).toBe(false);
    expect(canBroadcastClassroomPush({ ...base, membershipRole: null })).toBe(false);
  });

  it('allows the classroom owner and a teacher member', () => {
    expect(canBroadcastClassroomPush({ ...base, userId: 'teacher-1' })).toBe(true);
    expect(canBroadcastClassroomPush({ ...base, membershipRole: 'teacher' })).toBe(true);
  });

  it('allows admins and trusted cron calls', () => {
    expect(canBroadcastClassroomPush({ ...base, isAdmin: true })).toBe(true);
    expect(canBroadcastClassroomPush({ ...base, isCron: true, userId: null })).toBe(true);
  });

  it('rejects unauthenticated non-cron callers', () => {
    expect(canBroadcastClassroomPush({ ...base, userId: null })).toBe(false);
  });
});
