import { describe, expect, it } from 'vitest';
import {
  AVATAR_PRESETS,
  FRAME_ASSET_OVERRIDES,
  FREE_PROFILE_FRAMES,
  profileAssetUrl,
  resolveProfileImageUrl,
  uniqueProfileFrames,
} from './profileAssets';

describe('profile asset catalog', () => {
  it('exposes six distinct replacement avatars with distinct IDs and URLs', () => {
    expect(AVATAR_PRESETS.map((avatar) => avatar.id)).toEqual([
      'boy-robotics',
      'girl-pottery',
      'boy-chef',
      'girl-dance',
      'boy-photography',
      'girl-cycling',
    ]);
    expect(new Set(AVATAR_PRESETS.map((avatar) => avatar.id)).size).toBe(6);
    expect(new Set(AVATAR_PRESETS.map((avatar) => avatar.url)).size).toBe(6);
    expect(AVATAR_PRESETS.every((avatar) => avatar.url.includes('/clean-assets-replacement/'))).toBe(true);
  });

  it('keeps two free frames available and maps them to replacement WebPs', () => {
    expect(FREE_PROFILE_FRAMES.map((frame) => frame.id)).toEqual(['frame_free_1', 'frame_free_2']);
    expect(uniqueProfileFrames(FREE_PROFILE_FRAMES)).toHaveLength(2);
    expect(FREE_PROFILE_FRAMES.every((frame) => frame.image_url.includes('/clean-assets-replacement/'))).toBe(true);
  });

  it('drops duplicate frame IDs and duplicate resolved image assets without mutating the source', () => {
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

  it('deduplicates legacy store rows after applying their replacement override', () => {
    const frames = uniqueProfileFrames([
      { id: 'frame_diamond_comet', image_url: 'images/old-comet.webp' },
      { id: 'frame_diamond_crown', image_url: 'images/old-crown.webp' },
      { id: 'frame_diamond_comet_copy', image_url: 'clean-assets-replacement/galaxy-ring-transparent.webp' },
    ]);
    expect(frames.map((frame) => frame.id)).toEqual(['frame_diamond_comet', 'frame_diamond_crown']);
  });

  it('maps legacy storage paths and unknown manus-storage paths to replacement assets', () => {
    expect(profileAssetUrl('/manus-storage/frame-diamond-comet_596fd1b8.webp')).toContain('/clean-assets-replacement/galaxy-ring-transparent.webp');
    expect(profileAssetUrl('/manus-storage/unknown-frame.webp')).toContain('/clean-assets-replacement/aurora-glass-transparent.webp');
    expect(profileAssetUrl('images/frame-dragon.webp')).toContain('/clean-assets-replacement/fire-trail-transparent.webp');
  });

  it('falls back removed legacy avatar URLs to the first replacement avatar', () => {
    expect(resolveProfileImageUrl('./avatars/boy-cartoon-1.webp')).toBe(AVATAR_PRESETS[0].url);
    expect(resolveProfileImageUrl('/quiz-space/avatars/girl-6.webp')).toBe(AVATAR_PRESETS[0].url);
    expect(resolveProfileImageUrl('data:image/webp;base64,abc')).toBe('data:image/webp;base64,abc');
  });

  it('rewrites old curated avatar URLs to the new replacement set', () => {
    expect(profileAssetUrl('avatars/avatar-football-pro.webp')).toContain('/clean-assets-replacement/boy-robotics-transparent.webp');
    expect(profileAssetUrl('https://koomn1.github.io/quiz-space/avatars/avatar-music-pro.webp')).toContain('/clean-assets-replacement/boy-chef-transparent.webp');
  });

  it('contains no legacy deterministic catalog URLs or inaccessible manus-storage URLs', () => {
    const allProfileAssets = [
      ...AVATAR_PRESETS.map((avatar) => avatar.url),
      ...FREE_PROFILE_FRAMES.map((frame) => frame.image_url),
      ...Object.values(FRAME_ASSET_OVERRIDES),
    ];
    expect(allProfileAssets.every((asset) => asset.includes('/clean-assets-replacement/'))).toBe(true);
    expect(allProfileAssets.every((asset) => !asset.startsWith('/manus-storage/'))).toBe(true);
    expect(allProfileAssets.every((asset) => asset.endsWith('.webp'))).toBe(true);
  });
});
