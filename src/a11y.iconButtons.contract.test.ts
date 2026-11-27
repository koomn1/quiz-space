import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('icon-only buttons keep accessible names', () => {
  it('close buttons are labelled', () => {
    for (const f of ['DrivePicker', 'EssayReviewModal', 'FlashcardsModal', 'NetworkFailedModal', 'PopupBlockedModal']) {
      expect(read(`./components/${f}.tsx`)).toContain("aria-label={isAr ? 'إغلاق' : 'Close'}");
    }
    expect(read('./components/OnboardingTour.tsx')).toContain('aria-label="إغلاق الجولة التعريفية"');
  });
  it('send buttons are labelled', () => {
    expect(read('./components/MessageInbox.tsx')).toContain("aria-label={isAr ? 'إرسال الرسالة' : 'Send message'}");
    expect(read('./components/Classrooms.tsx')).toContain("aria-label={isAr ? 'إرسال الرسالة' : 'Send message'}");
  });
  it('the 2FA toggle is an accessible switch', () => {
    const s = read('./pages/settings/Security.tsx');
    expect(s).toContain('role="switch"');
    expect(s).toContain('aria-checked={is2FAEnabled}');
  });
});
