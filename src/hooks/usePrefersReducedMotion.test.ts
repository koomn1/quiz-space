import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('reduced motion support', () => {
  it('3D canvases stop their render loop when the user prefers reduced motion', () => {
    for (const file of ['../components/Hero3DScene.tsx', '../components/cosmo/Cosmo3DGuide.tsx', '../components/mascot/CosmoGuideCanvas.tsx']) {
      const src = read(file);
      expect(src).toContain('usePrefersReducedMotion()');
      expect(src).toContain("frameloop={reducedMotion ? 'demand' : 'always'}");
    }
  });
  it('decorative sky animations are disabled under prefers-reduced-motion', () => {
    const src = read('../components/ShootingStarsBg.tsx');
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
    expect(src).toContain('animation: none !important');
  });
});
