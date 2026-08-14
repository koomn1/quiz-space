export function getRewardEventLabel(eventType: string, isAr: boolean): string {
  const labels: Record<string, { ar: string; en: string }> = {
    quiz_completion: { ar: 'إكمال اختبار', en: 'Quiz completion' },
    quiz_creation: { ar: 'إنشاء اختبار', en: 'Quiz creation' },
    daily_gift: { ar: 'هدية الحضور اليومية', en: 'Daily attendance gift' },
    daily_challenge: { ar: 'تحدي يومي', en: 'Daily challenge' },
    weekly_task: { ar: 'مهمة أسبوعية', en: 'Weekly task' },
    lucky_spin: { ar: 'عجلة الحظ', en: 'Lucky wheel' },
    mystery_box: { ar: 'الصندوق الغامض', en: 'Mystery box' },
    brain_challenge: { ar: 'تحدي الذكاء', en: 'Brain challenge' },
    admin_grant: { ar: 'منحة إدارية', en: 'Administrator grant' },
    store_purchase: { ar: 'شراء من المتجر', en: 'Store purchase' },
  };

  const label = labels[eventType];
  return label ? (isAr ? label.ar : label.en) : (isAr ? 'تحديث مكافآت' : 'Reward update');
}

export function getRewardEntryDetail(metadata: Record<string, unknown> | undefined, isAr: boolean): string | null {
  const value = metadata?.quiz_title || metadata?.title || metadata?.item_name || metadata?.challenge_name;
  if (typeof value !== 'string' || !value.trim()) return null;
  return isAr ? `عن: ${value}` : `For: ${value}`;
}
