import { describe, expect, it } from 'vitest';

import { isVersionNewer, parseVersion } from './nativeAppUpdate';

describe('native app update version contract', () => {
  it('parses mobile release versions', () => {
    expect(parseVersion('2.0.123')).toEqual([2, 0, 123]);
    expect(parseVersion('mobile-v2.0.123')).toBeNull();
    expect(parseVersion('2.0')).toBeNull();
  });

  it('only treats a semantically newer release as an update', () => {
    expect(isVersionNewer('2.0.11', '2.0.10')).toBe(true);
    expect(isVersionNewer('2.1.0', '2.0.99')).toBe(true);
    expect(isVersionNewer('2.0.10', '2.0.10')).toBe(false);
    expect(isVersionNewer('1.9.99', '2.0.0')).toBe(false);
  });
});
