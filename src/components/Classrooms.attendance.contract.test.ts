import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Classrooms attendance register contract', () => {
  it('includes a dedicated attendance tab with teacher-only persistence actions', async () => {
    const source = await readFile(new URL('./Classrooms.tsx', import.meta.url), 'utf8');

    expect(source).toContain("id: 'attendance'");
    expect(source).toContain("activeWorkspaceTab === 'attendance'");
    expect(source).toContain('canManageAttendance');
    expect(source).toContain('markClassroomAttendance');
    expect(source).toContain('getClassroomAttendanceRecords');
  });
});
