import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('useHorizontalDragScroll contract', () => {
  it('keeps fine-pointer wheel scrolling and pointer drag behavior together in a reusable hook', async () => {
    const source = await readFile(new URL('./useHorizontalDragScroll.ts', import.meta.url), 'utf8');

    expect(source).toContain("window.matchMedia('(pointer: fine)')");
    expect(source).toContain('event.currentTarget.setPointerCapture');
    expect(source).toContain('rail.scrollBy');
    expect(source).toContain('shouldSuppressClick');
  });
});
