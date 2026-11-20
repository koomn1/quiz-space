import { describe, expect, it } from 'vitest';
import {
  readLanyardVisibility,
  writeLanyardVisibility,
  readSocialVisibility,
  writeSocialVisibility,
  getDisplayLocation,
} from './profileLocation';

describe('profile lanyard persistence', () => {
  it('writes the enabled state into the serialized location payload', () => {
    const saved = writeLanyardVisibility('||bg:profile-cover-youth||coverText:||github:test', true);

    expect(saved).toMatch(/\|\|lanyard:on(?:\|\||$)/);
    expect(readLanyardVisibility(saved)).toBe(true);
  });

  it('writes the disabled state without duplicating the lanyard token', () => {
    const saved = writeLanyardVisibility('||bg:profile-cover-youth||lanyard:on||github:test', false);

    expect(saved).toContain('||lanyard:off||');
    expect(saved.match(/lanyard:/g)).toHaveLength(1);
    expect(readLanyardVisibility(saved)).toBe(false);
  });

  it('restores the state from old payloads even when bg is absent', () => {
    expect(readLanyardVisibility('github:test||lanyard:on||country:EG')).toBe(true);
    expect(readLanyardVisibility('github:test||lanyard:off||country:EG')).toBe(false);
    expect(readLanyardVisibility('||bg:profile-cover-youth||github:test')).toBe(false);
  });

  it('cleans internal tokens like lanyard:off and bg from display location', () => {
    expect(getDisplayLocation('كفرالشيخ||lanyard:off')).toBe('كفرالشيخ');
    expect(getDisplayLocation('||bg:profile-cover-youth||lanyard:on')).toBeNull();
    expect(getDisplayLocation('Cairo||country:EG||lanyard:on')).toBe('Cairo');
    expect(getDisplayLocation(null)).toBeNull();
    expect(getDisplayLocation('Alexandria')).toBe('Alexandria');
  });
});

describe('profile social visibility persistence', () => {
  it('defaults to visible when token is not present', () => {
    expect(readSocialVisibility(null)).toBe(true);
    expect(readSocialVisibility('')).toBe(true);
    expect(readSocialVisibility('Cairo||lanyard:on')).toBe(true);
  });

  it('writes hidden and restores as false', () => {
    const saved = writeSocialVisibility('Cairo||lanyard:on', false);
    expect(saved).toContain('social:hidden');
    expect(readSocialVisibility(saved)).toBe(false);
  });

  it('writes visible and restores as true', () => {
    const saved = writeSocialVisibility('Cairo||social:hidden||lanyard:on', true);
    expect(saved).toContain('social:visible');
    expect(readSocialVisibility(saved)).toBe(true);
  });

  it('strips social tokens from getDisplayLocation', () => {
    expect(getDisplayLocation('Alexandria||social:hidden||lanyard:on')).toBe('Alexandria');
    expect(getDisplayLocation('||social:hidden')).toBeNull();
  });
});

