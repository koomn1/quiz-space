import { describe, expect, it } from 'vitest';
import { AVATAR_PRESETS, FREE_PROFILE_FRAMES, uniqueProfileFrames } from './profileAssets';

describe('profile asset catalog', () => {
  it('does not expose the removed legacy cartoon avatar IDs', () => {
    expect(AVATAR_PRESETS).toHaveLength(8);
    expect(AVATAR_PRESETS.every((avatar) => !/boy-cartoon|girl-cartoon/.test(avatar.url))).toBe(true);
    expect(new Set(AVATAR_PRESETS.map((avatar) => avatar.url)).size).toBe(AVATAR_PRESETS.length);
  });

  it('keeps the two free frames available and unique', () => {
    expect(FREE_PROFILE_FRAMES.map((frame) => frame.id)).toEqual(['frame_free_1', 'frame_free_2']);
    expect(uniqueProfileFrames(FREE_PROFILE_FRAMES)).toHaveLength(2);
  });

  it('drops duplicate frame IDs and duplicate image assets without mutating the source', () => {
    const source = [
      { id: 'a', image_url: 'images/a.webp' },
      { id: 'b', image_url: 'images/a.webp' },
      { id: 'a', image_url: 'images/b.webp' },
      { id: 'c', image_url: 'images/c.webp' },
    ];
    expect(uniqueProfileFrames(source)).toEqual([
      { id: 'a', image_url: 'images/a.webp' },
      { id: 'c', image_url: 'images/c.webp' },
    ]);
    expect(source).toHaveLength(4);
  });
});
