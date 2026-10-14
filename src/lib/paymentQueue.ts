import type { PaymentProof } from '../types';

export interface PaymentRequestRecord {
  id?: string;
  user_id?: string;
  userId?: string;
  name?: string;
  email?: string;
  plan_id?: string;
  planId?: string;
  plan_name?: string;
  planName?: string;
  plan_price?: number | string | null;
  planPrice?: number | string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
  payment_screenshot?: string | null;
  paymentScreenshot?: string | null;
  receiptUrl?: string | null;
  reject_reason?: string | null;
  notes?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export function normalizePaymentRequest(record: PaymentRequestRecord): PaymentProof & { planPrice?: number | string; paymentMethod?: string } {
  const amount = record.amount ?? record.plan_price ?? record.planPrice ?? '';
  const paymentMethod = record.payment_method || record.paymentMethod || 'request';
  return {
    id: String(record.id || ''),
    userId: String(record.user_id || record.userId || ''),
    userName: String(record.name || record.email || 'مشترك كوزميك'),
    planId: String(record.plan_id || record.planId || record.plan_name || record.planName || ''),
    planName: String(record.plan_name || record.planName || 'الباقة المميزة'),
    planPrice: record.plan_price ?? record.planPrice ?? '',
    amount,
    method: paymentMethod as PaymentProof['method'],
    paymentMethod,
    status: (record.status || 'pending') as PaymentProof['status'],
    submittedAt: String(record.created_at || record.createdAt || ''),
    receiptUrl: record.payment_screenshot || record.paymentScreenshot || record.receiptUrl || '',
    notes: record.notes || undefined,
  };
}

export function mapPendingPaymentRequests(records: PaymentRequestRecord[]): PaymentProof[] {
  return records.filter((record) => record.status === 'pending').map(normalizePaymentRequest);
}

export function paymentAmountLabel(amount: unknown, isAr: boolean): string {
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    return `${amount.toLocaleString(isAr ? 'ar-EG' : 'en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
  }
  if (typeof amount === 'string' && amount.trim()) return `${amount.trim()} ${isAr ? 'ج.م' : 'EGP'}`;
  return isAr ? 'غير متوفر في الطلب القديم' : 'Not recorded on legacy request';
}
