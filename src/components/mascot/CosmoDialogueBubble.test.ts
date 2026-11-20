import { describe, expect, it } from 'vitest';
import { CosmoDialogueBubble } from './CosmoDialogueBubble';
import { CosmoFallbackSvg } from './CosmoGuideCanvas';
import { CosmoTourSpotlight } from './CosmoTourSpotlight';

describe('Cosmo Mascot Components', () => {
  it('exports CosmoDialogueBubble as a valid component function', () => {
    expect(typeof CosmoDialogueBubble).toBe('function');
  });

  it('exports CosmoFallbackSvg as a valid component function', () => {
    expect(typeof CosmoFallbackSvg).toBe('function');
  });

  it('exports CosmoTourSpotlight as a valid component function', () => {
    expect(typeof CosmoTourSpotlight).toBe('function');
  });
});
