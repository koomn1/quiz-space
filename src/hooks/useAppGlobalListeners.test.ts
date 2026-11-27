import { describe, expect, it } from 'vitest';
import { isCommandShortcut } from './useAppGlobalListeners';

describe('isCommandShortcut', () => {
  it('matches Ctrl/Cmd+K outside inputs only', () => {
    expect(isCommandShortcut({ ctrlKey: true, metaKey: false, key: 'k' }, false)).toBe(true);
    expect(isCommandShortcut({ ctrlKey: false, metaKey: true, key: 'K' }, false)).toBe(true);
    expect(isCommandShortcut({ ctrlKey: true, metaKey: false, key: 'k' }, true)).toBe(false);
    expect(isCommandShortcut({ ctrlKey: false, metaKey: false, key: 'k' }, false)).toBe(false);
    expect(isCommandShortcut({ ctrlKey: true, metaKey: false, key: 'j' }, false)).toBe(false);
  });
});
