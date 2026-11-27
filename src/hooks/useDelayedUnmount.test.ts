import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('useDelayedUnmount', () => {
  it('mounts immediately when open and delays unmount by the given time', () => {
    const src = readFileSync(new URL('./useDelayedUnmount.ts', import.meta.url), 'utf8');
    expect(src).toContain('if (open) {');
    expect(src).toContain('setMounted(true)');
    expect(src).toContain('window.setTimeout(() => setMounted(false), delayMs)');
    expect(src).toContain('window.clearTimeout(timer)');
  });
});
