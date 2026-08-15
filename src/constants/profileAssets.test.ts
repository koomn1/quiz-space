import { describe, expect, it } from 'vitest';
import { AVATAR_PRESETS, FRAME_ASSET_OVERRIDES, FREE_PROFILE_FRAMES, profileAssetUrl, resolveProfileImageUrl, uniqueProfileFrames } from './profileAssets';

describe('profile asset catalog', () => {
  it('does not expose the removed legacy cartoon avatar IDs', () => {
    expect(AVATAR_PRESETS).toHaveLength(6);
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
  it('ensures every preset avatar has a valid label, gender, and unique id', () => {
    const ids = AVATAR_PRESETS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const avatar of AVATAR_PRESETS) {
      expect(avatar.id).toBeTruthy();
      expect(avatar.url).toBeTruthy();
      expect(['boy', 'girl']).toContain(avatar.gender);
      expect(avatar.labelAr).toBeTruthy();
    }
  });

  it('maps legacy storage paths to project-served frame assets', () => {
    expect(profileAssetUrl('/manus-storage/frame-diamond-comet_596fd1b8.webp')).toContain('/clean-assets-deterministic/frame-diamond-comet-quizspace-transparent.webp');
    expect(profileAssetUrl('/manus-storage/unknown-frame.webp')).toContain('/images/frame-free-2.webp');
  });

  it('falls back removed legacy avatar URLs to the first curated avatar', () => {
    expect(resolveProfileImageUrl('./avatars/boy-cartoon-1.webp')).toBe(AVATAR_PRESETS[0].url);
    expect(resolveProfileImageUrl('/quiz-space/avatars/girl-6.webp')).toBe(AVATAR_PRESETS[0].url);
    expect(resolveProfileImageUrl('data:image/webp;base64,abc')).toBe('data:image/webp;base64,abc');
  });

  it('rewrites old curated avatar URLs to the transparent production assets', () => {
    expect(profileAssetUrl('avatars/avatar-football-pro.webp')).toContain('/clean-assets-deterministic/avatar-football-pro-transparent.webp');
    expect(profileAssetUrl('https://koomn1.github.io/quiz-space/avatars/avatar-music-pro.webp')).toContain('/clean-assets-deterministic/avatar-music-pro-transparent.webp');
  });

  it('maps the curated catalog to audited transparent WebP assets', () => {
    const expectedTransparentAssets = [
      'avatar-football-pro-transparent.webp',
      'girl-studying-activity-transparent.webp',
      'avatar-music-pro-transparent.webp',
      'girl-school-walk-transparent.webp',
      'avatar-skater-pro-transparent.webp',
      'new_girl_avatar-transparent.webp',
      'frame-diamond-comet-quizspace-transparent.webp',
      'frame-diamond-crown-quizspace-transparent.webp',
      'frame-ramadan-lantern-quizspace-transparent.webp',
      'frame-back-to-school-quizspace-transparent.webp',
    ];
    const catalogAssets = [
      ...AVATAR_PRESETS.map((avatar) => avatar.url),
      ...Object.values(FRAME_ASSET_OVERRIDES),
    ];
    expect(catalogAssets).toHaveLength(expectedTransparentAssets.length);
    for (const filename of expectedTransparentAssets) {
      expect(catalogAssets.some((asset) => asset.endsWith(`/clean-assets-deterministic/${filename}`))).toBe(true);
    }
  });

  it('uses project-served assets rather than inaccessible manus-storage paths', () => {
    const allProfileAssets = [
      ...AVATAR_PRESETS.map((avatar) => avatar.url),
      ...FREE_PROFILE_FRAMES.map((frame) => frame.image_url),
      ...Object.values(FRAME_ASSET_OVERRIDES),
    ];
    expect(allProfileAssets.every((asset) => !asset.startsWith('/manus-storage/'))).toBe(true);
    expect(allProfileAssets.every((asset) => asset.endsWith('.webp'))).toBe(true);
  });
});
