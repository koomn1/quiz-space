import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const authBootstrapSource = readFileSync(new URL('./hooks/useAuthBootstrap.ts', import.meta.url), 'utf8');
const appAuthSource = `${source}\n${authBootstrapSource}`;

describe('Quiz Space App authentication success contract', () => {
  it('does not keep the stale nullable AuthModal success callback', () => {
    expect(source).not.toContain('onSuccess={(user, token)');
    expect(source).not.toContain("localStorage.setItem('local_auth_token', token)");
    expect(source).toContain('onClose={() => {');
    expect(source).toContain('authContext.clearPasswordRecovery()');
  });

  it('keeps Supabase as the authenticated session source of truth', () => {
    expect(appAuthSource).toContain('supabase.auth.onAuthStateChange');
    expect(appAuthSource).toContain('setUserId(user.id)');
  });

  it('defers database work outside the Supabase auth callback lock', () => {
    expect(appAuthSource).toContain('Never await Supabase/database work directly inside onAuthStateChange.');
    expect(appAuthSource).toContain('window.setTimeout(() => {');
    expect(appAuthSource).toContain('void (async () => {');
  });

  it('ignores stale auth events that arrive after a newer session event', () => {
    expect(appAuthSource).toContain('let authSyncGeneration = 0;');
    expect(appAuthSource).toContain('const generation = ++authSyncGeneration;');
    expect(appAuthSource).toContain('if (generation !== authSyncGeneration) return;');
  });

  it('delegates Google login to the shared AuthContext flow', () => {
    expect(source).toContain('const signedIn = await authContext.signInWithGoogle();');
    expect(source).not.toContain('supabase.auth.signInWithOAuth({');
    expect(source).not.toContain('redirectTo: window.location.origin + (import.meta.env.BASE_URL || \'/\')');
  });

  it('opens straight into the app with the normal bootstrap loader and no welcome splash', () => {
    // The owner asked for the splash to go away (Nov 28): the main link opens the app directly.
    expect(source).not.toContain('SplashScreen');
    expect(source).not.toContain('splashActive');
    expect(source).not.toContain('shouldShowSplash');
    expect(source).toContain('isBootstrapLoading');
    expect(source).not.toContain("quizspace:landing-splash-seen:v2");
  });
});
