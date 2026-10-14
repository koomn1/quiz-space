import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const toastSource = readFileSync(new URL('./AdminPaymentNotificationToast.tsx', import.meta.url), 'utf8');
const hookSource = readFileSync(new URL('../hooks/useAdminPaymentAlerts.ts', import.meta.url), 'utf8');
const dbSource = readFileSync(new URL('../lib/db.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

describe('Admin Payment Notifications Contract', () => {
  it('provides getPendingPaymentRequestsCount in database helpers', () => {
    expect(dbSource).toContain('export async function getPendingPaymentRequestsCount');
    expect(dbSource).toContain(".from('premium_requests')");
    expect(dbSource).toContain(".eq('status', 'pending')");
  });

  it('hooks real-time supabase channel and audio chime for pending payment alerts', () => {
    expect(hookSource).toContain("channel('admin-premium-payment-alerts')");
    expect(hookSource).toContain("playNotificationSound('chime')");
    expect(hookSource).toContain("new Notification(");
    expect(hookSource).toContain('quizspace-payment-request-submitted');
    expect(hookSource).toContain('.range(0, 99)');
    expect(hookSource).toContain('setAlerts(nextAlerts)');
  });

  it('renders floating in-app notification toast and binds to payments review queue', () => {
    expect(toastSource).toContain('export function AdminPaymentNotificationToast');
    expect(toastSource).toContain('onNavigateToPayments');
    expect(appSource).toContain('useAdminPaymentAlerts');
    expect(appSource).toContain('<AdminPaymentNotificationToast');
    expect(appSource).toContain('pendingPaymentCount={pendingPaymentCount}');
  });
});
