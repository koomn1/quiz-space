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

  it('uses the shared safe callback builder for Google login', () => {
    expect(source).toContain("import { getAuthRedirectUrl } from './lib/authRedirect';");
    expect(source).toContain("redirectTo: getAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL || '/')");
    expect(source).not.toContain("redirectTo: window.location.origin + (import.meta.env.BASE_URL || '/')");
  });

  it('shows the splash only for landing entry and remembers completion per session', () => {
    expect(source).toContain("const [splashActive, setSplashActive] = React.useState(false);");
    expect(source).toContain("if (activeTab !== 'landing')");
    expect(source).toContain("if (hostname === 'quiz-space-app.pages.dev')");
    expect(source).toContain("window.sessionStorage.getItem('quizspace:landing-splash-seen:v2')");
    expect(source).toContain("window.sessionStorage.setItem('quizspace:landing-splash-seen:v2', 'true')");
  });
});
