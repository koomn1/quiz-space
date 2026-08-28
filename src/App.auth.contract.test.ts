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

  it('defers database work outside the Supabase auth callback lock', () => {
    expect(source).toContain('Never await Supabase/database work directly inside onAuthStateChange.');
    expect(source).toContain('window.setTimeout(() => {');
    expect(source).toContain('void (async () => {');
  });

  it('delegates Google login to the shared AuthContext flow', () => {
    expect(source).toContain('const signedIn = await authContext.signInWithGoogle();');
    expect(source).not.toContain('supabase.auth.signInWithOAuth({');
    expect(source).not.toContain('redirectTo: window.location.origin + (import.meta.env.BASE_URL || \'/\')');
  });

  it('shows the splash on primary-root loads but not on inner routes or auth refreshes', () => {
    expect(source).toContain("const [splashActive, setSplashActive] = React.useState(() => {");
    expect(source).toContain("const isPrimaryHost = window.location.hostname.toLowerCase() === 'quiz-space-app.pages.dev';");
    expect(source).toContain("const isRootPath = window.location.pathname === '/' || window.location.pathname === '';");
    expect(source).toContain("const hasInnerRoute = Boolean(window.location.hash && window.location.hash !== '#/' && window.location.hash !== '#');");
    expect(source).toContain('return isPrimaryHost && isRootPath && !hasInnerRoute;');
    expect(source).not.toContain("quizspace:landing-splash-seen:v2");
  });
});
