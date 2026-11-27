import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateWithProviderChain, XKIRO_VISION_MODEL } from './providerChain';

const ok = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

describe('text requests that prefer the xKiro vision model', () => {
  afterEach(() => vi.unstubAllGlobals());
  const env = { XKIRO_API_KEY: 'x', INCEPTION_API_KEY: 'i' } as any;

  it('uses xKiro first for text-only prompts when asked', async () => {
    const fetchMock = vi.fn(async () => ok('{"a":1}'));
    vi.stubGlobal('fetch', fetchMock);
    const r = await generateWithProviderChain(env, [{ role: 'user', content: 'hi' }], { preferXkiro: true });
    expect(r).toMatchObject({ provider: 'xkiro', model: XKIRO_VISION_MODEL });
    expect(String((fetchMock.mock.calls[0] as any)[0])).toContain('xkiro.com');
  });
  it('falls back to Inception when xKiro returns nothing', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes('xkiro') ? ok('') : ok('{"b":2}')));
    vi.stubGlobal('fetch', fetchMock);
    const r = await generateWithProviderChain(env, [{ role: 'user', content: 'hi' }], { preferXkiro: true });
    expect(r.provider).toBe('inception');
  });
  it('keeps plain text requests on Inception', async () => {
    const fetchMock = vi.fn(async () => ok('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const r = await generateWithProviderChain(env, [{ role: 'user', content: 'hi' }]);
    expect(r.provider).toBe('inception');
  });
});

describe('noReasoning', () => {
  it('turns reasoning off for both providers', async () => {
    const bodies: any[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: any) => { bodies.push(JSON.parse(init.body)); return ok('{"a":1}'); }));
    await generateWithProviderChain({ XKIRO_API_KEY: 'x', INCEPTION_API_KEY: 'i' } as any, [{ role: 'user', content: 'hi' }], { preferXkiro: true, noReasoning: true });
    expect(bodies[0]).toMatchObject({ reasoning_effort: 'none', include_reasoning: false });
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: any) => { bodies.push(JSON.parse(init.body)); return ok('{"a":1}'); }));
    await generateWithProviderChain({ INCEPTION_API_KEY: 'i' } as any, [{ role: 'user', content: 'hi' }], { noReasoning: true });
    expect(bodies[1]).toMatchObject({ reasoning_effort: 'instant' });
    vi.unstubAllGlobals();
  });
});
