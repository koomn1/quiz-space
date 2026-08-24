import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const readSource = (relativePath: string) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const overlayPortal = readSource('components/OverlayPortal.tsx');
const quizCreator = readSource('pages/QuizCreator.tsx');
const drivePicker = readSource('components/DrivePicker.tsx');
const shareModal = readSource('components/ShareModal.tsx');
const authModal = readSource('components/AuthModal.tsx');
const welcomeAuth = readSource('components/WelcomeAuthOverlay.tsx');
const profileStats = readSource('components/ProfileStatsView.tsx');
const adminDashboard = readSource('pages/AdminDashboard.tsx');
const motivationHub = readSource('pages/MotivationHubPage.tsx');

describe('full-screen overlay viewport contract', () => {
  it('mounts overlays outside transformed page containers', () => {
    expect(overlayPortal).toContain('createPortal(children, document.body)');
    for (const source of [quizCreator, drivePicker, shareModal, authModal, welcomeAuth, profileStats, adminDashboard, motivationHub]) {
      expect(source).toContain('OverlayPortal');
    }
  });

  it('keeps long extraction/detail/payment overlays scrollable', () => {
    expect(quizCreator).toContain('fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto overscroll-contain');
    expect(quizCreator).toContain('overflow-y-auto overscroll-contain');
    expect(quizCreator).toContain('my-auto w-full max-w-lg');
    expect(drivePicker).toContain('overflow-y-auto overscroll-contain');
    expect(shareModal).toContain('max-h-[min(720px,90dvh)]');
    expect(profileStats).toContain('max-h-[90dvh]');
    expect(adminDashboard).toContain('max-h-[90dvh] overflow-y-auto');
    expect(motivationHub).toContain('overflow-y-auto overscroll-contain');
  });
});
