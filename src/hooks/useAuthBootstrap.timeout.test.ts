import { describe, expect, it, vi } from 'vitest';
import { withBootstrapTimeout } from './useAuthBootstrap';

describe('withBootstrapTimeout', () => {
  it('resolves fast requests', async () => {
    await expect(withBootstrapTimeout(Promise.resolve(1), 50)).resolves.toBe(1);
  });
  it('rejects a hanging request', async () => {
    vi.useFakeTimers();
    const p = withBootstrapTimeout(new Promise(() => {}), 5000);
    const assertion = expect(p).rejects.toThrow('BOOTSTRAP_REQUEST_TIMEOUT');
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
    vi.useRealTimers();
  });
});
