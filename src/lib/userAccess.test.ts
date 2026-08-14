import { describe, expect, it } from 'vitest';
import { canPersistAuthenticatedData } from './userAccess';

describe('canPersistAuthenticatedData', () => {
  it('permits only authenticated persistent user identifiers', () => {
    expect(canPersistAuthenticatedData('0ae7ce3c-3bfa-4e45-90ea-8d98a10fc202')).toBe(true);
    expect(canPersistAuthenticatedData('')).toBe(false);
    expect(canPersistAuthenticatedData(null)).toBe(false);
    expect(canPersistAuthenticatedData('user-local-sandbox')).toBe(false);
  });
});
