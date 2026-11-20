import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  COSMO_TOUR_STORAGE_KEY,
  getTourState,
  dismissTourStep,
  markFeatureSeen,
  shouldShowTour,
  resetTourGuide,
} from './cosmoTourGuide';

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

describe('cosmoTourGuide', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  it('uses the expected localStorage key', () => {
    expect(COSMO_TOUR_STORAGE_KEY).toBe('quizspace_cosmo_tour_v1');
  });

  it('returns default state when localStorage is empty', () => {
    const state = getTourState();
    expect(state).toEqual({
      currentStep: '',
      dismissedSteps: [],
      hasSeenArcadeIntro: false,
      seenFeatures: [],
    });
  });

  it('shows tour for newly added features when unvisited', () => {
    expect(shouldShowTour('rewards_arcade_v1')).toBe(true);
    expect(shouldShowTour('spin_wheel')).toBe(true);
  });

  it('persists dismissed tour step in localStorage and updates shouldShowTour', () => {
    dismissTourStep('rewards_arcade_v1');
    expect(shouldShowTour('rewards_arcade_v1')).toBe(false);

    const raw = mockStorage.getItem(COSMO_TOUR_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.dismissedSteps).toContain('rewards_arcade_v1');

    const state = getTourState();
    expect(state.dismissedSteps).toContain('rewards_arcade_v1');
  });

  it('does not duplicate dismissed step IDs', () => {
    dismissTourStep('step_1');
    dismissTourStep('step_1');
    const state = getTourState();
    expect(state.dismissedSteps.filter((id) => id === 'step_1')).toHaveLength(1);
  });

  it('marks feature as seen and updates hasSeenArcadeIntro for arcade features', () => {
    markFeatureSeen('rewards_arcade_v1');
    expect(shouldShowTour('rewards_arcade_v1')).toBe(false);

    const state = getTourState();
    expect(state.seenFeatures).toContain('rewards_arcade_v1');
    expect(state.hasSeenArcadeIntro).toBe(true);
  });

  it('marks general feature as seen without setting hasSeenArcadeIntro', () => {
    markFeatureSeen('daily_chest');
    expect(shouldShowTour('daily_chest')).toBe(false);

    const state = getTourState();
    expect(state.seenFeatures).toContain('daily_chest');
    expect(state.hasSeenArcadeIntro).toBe(false);
  });

  it('resets tour guide state and clears storage', () => {
    dismissTourStep('rewards_arcade_v1');
    markFeatureSeen('spin_wheel');
    expect(shouldShowTour('rewards_arcade_v1')).toBe(false);

    resetTourGuide();

    expect(mockStorage.getItem(COSMO_TOUR_STORAGE_KEY)).toBeNull();
    const state = getTourState();
    expect(state.dismissedSteps).toEqual([]);
    expect(state.seenFeatures).toEqual([]);
    expect(state.hasSeenArcadeIntro).toBe(false);
    expect(shouldShowTour('rewards_arcade_v1')).toBe(true);
  });

  it('handles corrupted localStorage JSON gracefully', () => {
    mockStorage.setItem(COSMO_TOUR_STORAGE_KEY, '{invalid json');
    const state = getTourState();
    expect(state.dismissedSteps).toEqual([]);
    expect(shouldShowTour('test_feature')).toBe(true);
  });
});
