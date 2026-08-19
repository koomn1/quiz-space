import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
const registrationSource = readFileSync(new URL('./serviceWorker.ts', import.meta.url), 'utf8');
const promptSource = readFileSync(new URL('../components/ServiceWorkerUpdatePrompt.tsx', import.meta.url), 'utf8');

describe('service worker update contract', () => {
  it('keeps a new worker waiting until the user accepts the refresh', () => {
    const installBlock = workerSource.split("self.addEventListener('activate'")[0];
    expect(installBlock).not.toContain('self.skipWaiting()');
    expect(workerSource).toContain("event.data?.type === 'SKIP_WAITING'");
    expect(workerSource).toContain('self.skipWaiting()');
  });

  it('bypasses cached worker scripts and exposes an explicit update path', () => {
    expect(registrationSource).toContain("updateViaCache: 'none'");
    expect(registrationSource).toContain('void registration.update()');
    expect(registrationSource).toContain("type: 'SKIP_WAITING'");
    expect(promptSource).toContain('controllerchange');
    expect(promptSource).toContain('تحديث الآن');
  });

  it('versions profile asset caches and precaches the current avatar set', () => {
    expect(workerSource).toContain("const CACHE_VERSION = 'v3'");
    expect(workerSource).toContain('avatar-boy-football-analyst-v2.webp');
    expect(workerSource).toContain('avatar-girl-astronomy-v2.webp');
  });
});
