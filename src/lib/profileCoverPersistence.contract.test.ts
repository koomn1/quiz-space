import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dbSource = readFileSync(new URL('./db.ts', import.meta.url), 'utf8');
const profileSource = readFileSync(new URL('../pages/UserProfile.tsx', import.meta.url), 'utf8');

describe('profile cover persistence contract', () => {
  it('keeps partial sign-in profile synchronization from overwriting profile customization', () => {
    expect(dbSource).toContain('if (bio !== undefined) updatedUser.bio = bio;');
    expect(dbSource).toContain('if (location !== undefined) updatedUser.location = location;');
    expect(dbSource).toContain("updatedUser.cover_url = match?.[1]?.trim() || null;");
  });

  it('maps and restores the independent cover URL when legacy serialized settings are absent', () => {
    expect(dbSource).toContain("coverUrl: userRow?.cover_url || ''");
    expect(profileSource).toContain("parsedCustomBgUrl = stats.coverUrl;");
    expect(profileSource).toContain("parsedBg = 'custom';");
  });

  it('keeps every visible built-in cover valid after a reload', () => {
    expect(profileSource).toContain('"profile-cover-1", "profile-cover-2", "profile-cover-3"');
  });
});
