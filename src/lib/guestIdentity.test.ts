import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateGuestIdentity, isGuestIdentity } from './guestIdentity';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('guest identity', () => {
  it('creates a stable browser-local id and localized display name', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });

    const arabic = getOrCreateGuestIdentity('ar');
    const repeated = getOrCreateGuestIdentity('ar');
    const english = getOrCreateGuestIdentity('en');

    expect(arabic.id).toMatch(/^user-guest-[A-HJ-NP-Z2-9]{6}$/);
    expect(arabic.name).toBe(`زائر #${arabic.id.slice(-6)}`);
    expect(repeated).toEqual(arabic);
    expect(english.id).toBe(arabic.id);
    expect(english.name).toBe(`Guest #${arabic.id.slice(-6)}`);
  });

  it('replaces malformed or legacy stored identity data instead of reusing it', () => {
    const storage = new MemoryStorage();
    storage.setItem('quizspace_guest_identity_v1', JSON.stringify({ id: 'user-guest-IO10AB', name: 'زائر #IO10AB' }));
    vi.stubGlobal('window', { localStorage: storage });

    const identity = getOrCreateGuestIdentity('ar');

    expect(identity.id).toMatch(/^user-guest-[A-HJ-NP-Z2-9]{6}$/);
    expect(identity.name).toBe(`زائر #${identity.id.slice(-6)}`);
  });

  it('classifies guest-compatible legacy ids without treating a real user id as a guest', () => {
    expect(isGuestIdentity(null)).toBe(true);
    expect(isGuestIdentity('anonymous')).toBe(true);
    expect(isGuestIdentity('local-user-old')).toBe(true);
    expect(isGuestIdentity('user-guest-ABCD23')).toBe(true);
    expect(isGuestIdentity('auth-user-123')).toBe(false);
  });
});
