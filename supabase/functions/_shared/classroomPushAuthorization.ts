export interface ClassroomPushActor {
  userId: string | null;
  classroomOwnerId: string;
  membershipRole: string | null;
  isAdmin: boolean;
  isCron: boolean;
}

export function canBroadcastClassroomPush(actor: ClassroomPushActor): boolean {
  if (actor.isCron || actor.isAdmin) return true;
  if (!actor.userId) return false;
  if (actor.classroomOwnerId === actor.userId) return true;
  return actor.membershipRole === 'teacher';
}
