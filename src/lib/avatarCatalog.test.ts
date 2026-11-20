import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canPurchaseFrame,
  getActiveAvatarFrame,
  getAvailableAvatarFrames,
  getUserUnlockedFrames,
  setActiveAvatarFrame,
  unlockAvatarFrame,
} from './avatarCatalog';

class LocalStorageMock implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
}

const mockStorage = new LocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

describe('avatarCatalog - Avatar Frame Store & Customizer', () => {
  const userId = 'test-player-42';

  beforeEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getAvailableAvatarFrames', () => {
    it('lists all 6 luxury brand-themed avatar frames with correct coin prices', () => {
      const frames = getAvailableAvatarFrames();
      expect(frames.length).toBe(6);

      const frameMap = new Map(frames.map((f) => [f.id, f]));

      expect(frameMap.get('frame-petrol-obsidian')?.priceCoins).toBe(50);
      expect(frameMap.get('frame-bright-teal-neon')?.priceCoins).toBe(100);
      expect(frameMap.get('frame-coral-flame')?.priceCoins).toBe(200);
      expect(frameMap.get('frame-golden-cosmo')?.priceCoins).toBe(350);
      expect(frameMap.get('frame-diamond-celestial')?.priceCoins).toBe(500);
      expect(frameMap.get('frame-sand-ivory')?.priceCoins).toBe(75);

      // Verify all frames have required attributes
      frames.forEach((frame) => {
        expect(frame.name).toBeTruthy();
        expect(frame.nameAr).toBeTruthy();
        expect(frame.frameClass).toBeTruthy();
        expect(frame.priceCoins).toBeGreaterThan(0);
      });
    });
  });

  describe('canPurchaseFrame', () => {
    it('returns true when user has enough coins', () => {
      expect(canPurchaseFrame('frame-petrol-obsidian', 50)).toBe(true);
      expect(canPurchaseFrame('frame-petrol-obsidian', 100)).toBe(true);
      expect(canPurchaseFrame('frame-diamond-celestial', 500)).toBe(true);
    });

    it('returns false when user has insufficient coins', () => {
      expect(canPurchaseFrame('frame-petrol-obsidian', 49)).toBe(false);
      expect(canPurchaseFrame('frame-coral-flame', 150)).toBe(false);
      expect(canPurchaseFrame('frame-diamond-celestial', 0)).toBe(false);
    });

    it('returns false for unknown frame id', () => {
      expect(canPurchaseFrame('non-existent-frame', 10000)).toBe(false);
    });
  });

  describe('getUserUnlockedFrames', () => {
    it('returns empty array if user has not unlocked any frames', () => {
      expect(getUserUnlockedFrames(userId)).toEqual([]);
    });

    it('returns unlocked frame ids saved in localStorage key quizspace_user_frames_${userId}', () => {
      mockStorage.setItem(
        `quizspace_user_frames_${userId}`,
        JSON.stringify(['frame-petrol-obsidian', 'frame-sand-ivory'])
      );
      expect(getUserUnlockedFrames(userId)).toEqual([
        'frame-petrol-obsidian',
        'frame-sand-ivory',
      ]);
    });

    it('handles corrupted localStorage data safely', () => {
      mockStorage.setItem(`quizspace_user_frames_${userId}`, 'invalid-json{');
      expect(getUserUnlockedFrames(userId)).toEqual([]);
    });
  });

  describe('unlockAvatarFrame', () => {
    it('fails if user has insufficient coins without touching user state', async () => {
      const result = await unlockAvatarFrame(userId, 'frame-coral-flame', 100);
      expect(result.success).toBe(false);
      expect(result.newCoins).toBe(100);
      expect(getUserUnlockedFrames(userId)).not.toContain('frame-coral-flame');
    });

    it('fails if frame does not exist', async () => {
      const result = await unlockAvatarFrame(userId, 'unknown-frame-xyz', 1000);
      expect(result.success).toBe(false);
      expect(result.newCoins).toBe(1000);
    });

    it('successfully purchases frame using coins only, deducting correct coins and persisting unlock', async () => {
      const initialCoins = 300;
      const result = await unlockAvatarFrame(userId, 'frame-coral-flame', initialCoins);

      expect(result.success).toBe(true);
      // frame-coral-flame costs 200 coins
      expect(result.newCoins).toBe(100);
      expect(getUserUnlockedFrames(userId)).toContain('frame-coral-flame');
    });

    it('returns existing balance without double charging if already unlocked', async () => {
      mockStorage.setItem(
        `quizspace_user_frames_${userId}`,
        JSON.stringify(['frame-coral-flame'])
      );

      const result = await unlockAvatarFrame(userId, 'frame-coral-flame', 500);
      expect(result.success).toBe(true);
      expect(result.newCoins).toBe(500);
    });
  });

  describe('active frame state management', () => {
    it('returns null if no active frame is set', () => {
      expect(getActiveAvatarFrame(userId)).toBeNull();
    });

    it('sets and retrieves active avatar frame', () => {
      setActiveAvatarFrame(userId, 'frame-bright-teal-neon');
      expect(getActiveAvatarFrame(userId)).toBe('frame-bright-teal-neon');
    });

    it('allows clearing or changing the active frame', () => {
      setActiveAvatarFrame(userId, 'frame-golden-cosmo');
      expect(getActiveAvatarFrame(userId)).toBe('frame-golden-cosmo');

      setActiveAvatarFrame(userId, '');
      expect(getActiveAvatarFrame(userId)).toBeNull();
    });
  });
});
