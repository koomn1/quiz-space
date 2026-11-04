import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./PremiumBackground.tsx', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
const splash = readFileSync(new URL('./SplashScreen.tsx', import.meta.url), 'utf8');

describe('background and splash lifecycle contracts', () => {
  it('does not schedule animation frames while the tab is hidden', () => {
    expect(source).toContain('if (!isTabActive)');
    expect(source).toContain('requestRef.current = null;');
    expect(source).not.toContain('if (!isTabActive) {\n        requestRef.current = requestAnimationFrame(draw);');
  });

  it('keeps splash videos in runtime cache without precaching every variant', () => {
    expect(serviceWorker).not.toContain('VIDEOS_TO_PRECACHE');
    expect(serviceWorker).toContain('const VIDEO_CACHE');
    expect(serviceWorker).toContain('cache.put(event.request, response.clone())');
    expect(splash).toContain('preload="metadata"');
    expect(splash).toContain('src={splashSource}');
  });
});
