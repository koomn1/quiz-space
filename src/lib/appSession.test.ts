import { describe, expect, it } from 'vitest';
import { clearLocalSession, LOCAL_SESSION_KEYS, ownsCachedClassroom } from './appSession';

const mem = (data: Record<string, string>) => ({
  getItem: (k: string) => (k in data ? data[k] : null),
  removeItem: (k: string) => { delete data[k]; },
});

describe('appSession', () => {
  it('clears every local identity key and nothing else', () => {
    const data: Record<string, string> = { other: 'x' };
    LOCAL_SESSION_KEYS.forEach((k) => { data[k] = '1'; });
    clearLocalSession(mem(data));
    expect(Object.keys(data)).toEqual(['other']);
  });
  it('detects classroom ownership and tolerates bad data', () => {
    expect(ownsCachedClassroom('u1', mem({ classroom_list: JSON.stringify([{ createdBy: 'u1' }]) }))).toBe(true);
    expect(ownsCachedClassroom('u1', mem({ classroom_list: JSON.stringify([{ createdBy: 'u2' }]) }))).toBe(false);
    expect(ownsCachedClassroom('u1', mem({ classroom_list: '{bad' }))).toBe(false);
    expect(ownsCachedClassroom('u1', mem({}))).toBe(false);
  });
});
