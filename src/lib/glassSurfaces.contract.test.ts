import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const css = readSource('../index.css');
const billing = readSource('../components/BillingSection.tsx');
const analytics = readSource('../pages/AnalyticsDashboard.tsx');

describe('glass surface design contracts', () => {
  it('uses shared readable surfaces and preserves selected plan/border states', () => {
    expect(css).toContain('.uipro-glass-surface');
    expect(css).toContain('background: var(--lg-surface-strong');
    expect(css).toContain('inset 0 0 0 1px var(--lg-border-strong');
    expect(css).toContain('.uipro-glass-plan[data-selected="true"]');
    expect(billing).toContain('data-selected={isSelected}');
    expect(billing).toContain('uipro-glass-plan gsap-plan-card');
    expect(css).toContain('@media (prefers-reduced-transparency: reduce)');
  });

  it('applies the shared glass surface to plans and dashboard analytics', () => {
    expect(billing).toContain('uipro-glass-surface');
    expect(analytics).toContain('uipro-glass-surface');
  });

  it('applies glass surfaces to floating notices and dashboard menus', () => {
    for (const path of [
      '../components/Toast.tsx',
      '../components/ProcessingCenterBanner.tsx',
      '../components/AdminPaymentNotificationToast.tsx',
      '../components/NotificationDropdown.tsx',
      '../components/CommandPalette.tsx',
      '../app/AppShell.tsx',
    ]) {
      expect(readSource(path), `${path} should use the shared glass utility`).toContain('uipro-glass-surface');
    }
  });
});
