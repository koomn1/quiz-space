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

  it('limits a learner to the personal attendance row in the UI and RLS policy', async () => {
    const [componentSource, migrationSource] = await Promise.all([
      readFile(new URL('./Classrooms.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../supabase/migrations/20260821_classroom_attendance_register.sql', import.meta.url), 'utf8'),
    ]);

    expect(componentSource).toContain('attendanceVisibleStudents');
    expect(componentSource).toContain('student.studentId === currentUserId');
    expect(migrationSource).toContain('classroom_attendance_records.student_id = (select auth.uid())::text');
  });
});
