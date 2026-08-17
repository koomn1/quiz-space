import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const guestLandingSource = readFileSync(new URL('./pages/GuestLandingPage.tsx', import.meta.url), 'utf8');
const headerSource = readFileSync(new URL('./components/Header.tsx', import.meta.url), 'utf8');

describe('guest landing and authenticated home contract', () => {
  it('renders the standalone guest landing only for unauthenticated visitors', () => {
    expect(appSource).toContain("import GuestLandingPage from './pages/GuestLandingPage'");
    expect(appSource).toContain("authContext.isAuthenticated && userId && !userId.startsWith('user-guest') ? (");
    expect(appSource).toContain('<GuestLandingPage');
  });

  it('uses the official brand plus real in-product home and quiz-creation screenshots', () => {
    expect(guestLandingSource).toContain("import { MainLogo } from '../components/MainLogo'");
    expect(guestLandingSource).toContain("/showcase/home-dashboard.webp");
    expect(guestLandingSource).toContain("/showcase/quiz-creator.png");
    expect(guestLandingSource).toContain("/images/brain_challenge.webp");
    expect(guestLandingSource).toContain("/images/lucky_wheel.webp");
  });

  it('shows an authenticated account control in the header instead of a login-only experience', () => {
    expect(headerSource).toContain("onClick={() => setTab('profile')}");
    expect(headerSource).toContain("userName || (lang === 'ar' ? 'حسابي' : 'My account')");
  });
});
