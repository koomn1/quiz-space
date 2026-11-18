import { describe, expect, it } from 'vitest';
import { readLanyardVisibility, writeLanyardVisibility } from './profileLocation';

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
});
