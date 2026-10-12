import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const routesSource = readFileSync(resolve(process.cwd(), 'src/app/AppRoutes.tsx'), 'utf8');
const appAndRoutesSource = `${appSource}\n${routesSource}`;
const workerClientSource = readFileSync(resolve(process.cwd(), 'src/services/aiWorkerClient.ts'), 'utf8');

describe('post-save and Cosmo responsiveness contracts', () => {
  it('preserves the creator when the save flow explicitly keeps it open', () => {
    expect(appAndRoutesSource).toContain("if (!options?.keepCreatorOpen) {");
    expect(appAndRoutesSource).toContain("setQuizToEdit(null);");
    expect(appAndRoutesSource).toContain("void fetchQuizzesList();");
  });

  it('bounds Cosmo streaming and fallback requests separately', () => {
    expect(workerClientSource).toContain('const AI_STREAM_TIMEOUT_MS = 60_000;');
    expect(workerClientSource).toContain('const AI_STREAM_FALLBACK_TIMEOUT_MS = 30_000;');
    expect(workerClientSource).not.toContain('window.setTimeout(() => controller.abort(), 120_000)');
    expect(workerClientSource).toContain('}, AI_STREAM_FALLBACK_TIMEOUT_MS);');
  });
});
