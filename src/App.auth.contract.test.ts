import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

describe('Quiz Space App authentication success contract', () => {
  it('does not keep the stale nullable AuthModal success callback', () => {
    expect(source).not.toContain('onSuccess={(user, token)');
    expect(source).not.toContain("localStorage.setItem('local_auth_token', token)");
    expect(source).toContain('onClose={() => {');
    expect(source).toContain('authContext.clearPasswordRecovery()');
  });

  it('keeps Supabase as the authenticated session source of truth', () => {
    expect(source).toContain('supabase.auth.onAuthStateChange');
    expect(source).toContain('setUserId(user.id)');
  });
});
