import { describe, expect, it } from 'vitest';
import {
  ArcadeHubModal,
  CosmicMatchGame,
  DailySpinWheel,
  WordMatrixPuzzle,
} from './index';

describe('Games Module Exports Contract', () => {
  it('exports WordMatrixPuzzle component', () => {
    expect(typeof WordMatrixPuzzle).toBe('function');
  });

  it('exports CosmicMatchGame component', () => {
    expect(typeof CosmicMatchGame).toBe('function');
  });

  it('exports DailySpinWheel component', () => {
    expect(typeof DailySpinWheel).toBe('function');
  });

  it('exports ArcadeHubModal component', () => {
    expect(typeof ArcadeHubModal).toBe('function');
  });
});
