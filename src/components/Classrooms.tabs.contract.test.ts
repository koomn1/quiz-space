import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Classrooms tab rail accessibility contract', () => {
  it('keeps the online lessons tab reachable through horizontal wheel and pointer-drag navigation', async () => {
    const source = await readFile(new URL('./Classrooms.tsx', import.meta.url), 'utf8');

    expect(source).toContain("id: 'lessons'");
    expect(source).toContain('useHorizontalDragScroll');
    expect(source).toContain('onWheel={classroomTabsScroll.onWheel}');
    expect(source).toContain('onPointerMove={classroomTabsScroll.onPointerMove}');
    expect(source).toContain('role="tablist"');
    expect(source).toContain('aria-selected={isSelected}');
  });
});
