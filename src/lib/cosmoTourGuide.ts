import { useEffect, useState, useCallback } from 'react';
import { CosmoTourState } from '../types';

export const COSMO_TOUR_STORAGE_KEY = 'quizspace_cosmo_tour_v1';

const DEFAULT_STATE: CosmoTourState = {
  currentStep: '',
  dismissedSteps: [],
  hasSeenArcadeIntro: false,
  seenFeatures: [],
};

const ARCADE_FEATURE_KEYS = new Set([
  'rewards_arcade_v1',
  'arcade_intro',
  'arcade_hub',
  'cosmic_match',
  'word_matrix',
  'spin_wheel',
]);

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // LocalStorage restricted or blocked
  }

  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    // LocalStorage restricted
  }

  return null;
}

export function getTourState(): CosmoTourState {
  const storage = getStorage();
  if (!storage) {
    return { ...DEFAULT_STATE };
  }

  try {
    const raw = storage.getItem(COSMO_TOUR_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STATE };
    }
    const parsed = JSON.parse(raw);
    return {
      currentStep: typeof parsed.currentStep === 'string' ? parsed.currentStep : '',
      dismissedSteps: Array.isArray(parsed.dismissedSteps) ? parsed.dismissedSteps : [],
      hasSeenArcadeIntro: Boolean(parsed.hasSeenArcadeIntro),
      seenFeatures: Array.isArray(parsed.seenFeatures) ? parsed.seenFeatures : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveTourState(state: CosmoTourState): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(COSMO_TOUR_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Graceful fallback if quota exceeded
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('quizspace:cosmo_tour_update', { detail: state }));
    } catch {
      // Ignore
    }
  }
}

export function dismissTourStep(stepId: string): void {
  const current = getTourState();
  const dismissed = current.dismissedSteps.includes(stepId)
    ? current.dismissedSteps
    : [...current.dismissedSteps, stepId];

  saveTourState({
    ...current,
    dismissedSteps: dismissed,
    currentStep: current.currentStep === stepId ? '' : current.currentStep,
  });
}

export function markFeatureSeen(featureId: string): void {
  const current = getTourState();
  const seen = current.seenFeatures || [];
  const updatedSeen = seen.includes(featureId) ? seen : [...seen, featureId];
  const isArcade = ARCADE_FEATURE_KEYS.has(featureId) || current.hasSeenArcadeIntro;

  saveTourState({
    ...current,
    seenFeatures: updatedSeen,
    hasSeenArcadeIntro: isArcade,
  });
}

export function shouldShowTour(featureId: string): boolean {
  const current = getTourState();
  if (current.dismissedSteps.includes(featureId)) {
    return false;
  }
  if (current.seenFeatures && current.seenFeatures.includes(featureId)) {
    return false;
  }
  return true;
}

export function resetTourGuide(): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(COSMO_TOUR_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('quizspace:cosmo_tour_update', { detail: DEFAULT_STATE }));
    } catch {
      // Ignore
    }
  }
}

export function useCosmoTour(featureId?: string) {
  const [tourState, setTourState] = useState<CosmoTourState>(getTourState);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CosmoTourState>;
      if (customEvent.detail) {
        setTourState(customEvent.detail);
      } else {
        setTourState(getTourState());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('quizspace:cosmo_tour_update', handleUpdate);
      window.addEventListener('storage', handleUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('quizspace:cosmo_tour_update', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      }
    };
  }, []);

  const dismiss = useCallback(
    (stepId?: string) => {
      const target = stepId || featureId;
      if (target) {
        dismissTourStep(target);
        setTourState(getTourState());
      }
    },
    [featureId]
  );

  const markSeen = useCallback(
    (targetId?: string) => {
      const target = targetId || featureId;
      if (target) {
        markFeatureSeen(target);
        setTourState(getTourState());
      }
    },
    [featureId]
  );

  const isVisible = featureId ? shouldShowTour(featureId) : false;

  return {
    tourState,
    isVisible,
    dismiss,
    markSeen,
    resetTourGuide,
  };
}
