import type { BadgeRarity } from '../types';

export interface BadgeRarityStyle {
  borderColor: string;
  glowColor: string;
  bgGradient: string;
}

export function getBadgeRarityStyle(rarity: BadgeRarity | string): BadgeRarityStyle {
  switch (rarity) {
    case 'legendary':
      return {
        borderColor: 'var(--color-coral, #EE8361)',
        glowColor: 'rgba(42, 195, 187, 0.45)',
        bgGradient: 'linear-gradient(135deg, rgba(238, 131, 97, 0.25) 0%, rgba(42, 195, 187, 0.15) 50%, rgba(7, 36, 36, 0.9) 100%)',
      };
    case 'rare':
      return {
        borderColor: 'var(--color-bright-teal, #2AC3BB)',
        glowColor: 'rgba(42, 195, 187, 0.35)',
        bgGradient: 'linear-gradient(135deg, rgba(42, 195, 187, 0.2) 0%, rgba(0, 116, 114, 0.85) 100%)',
      };
    case 'common':
    default:
      return {
        borderColor: 'var(--color-petrol, #007472)',
        glowColor: 'rgba(0, 116, 114, 0.25)',
        bgGradient: 'linear-gradient(135deg, rgba(0, 116, 114, 0.15) 0%, rgba(7, 36, 36, 0.85) 100%)',
      };
  }
}

export function getRewardEventLabel(eventType: string, isAr: boolean | string): string {
  const isArabic = typeof isAr === 'boolean' ? isAr : isAr === 'ar';
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
    mini_game_cosmic_match: { ar: 'لعبة تطابق الذاكرة', en: 'Cosmic Memory Match' },
    mini_game_word_matrix: { ar: 'لعبة مصفوفة الكلمات', en: 'Word Matrix Puzzle' },
    mini_game_spin_wheel: { ar: 'عجلة الحظ اليومية', en: 'Daily Lucky Spin Wheel' },
    avatar_frame_purchase: { ar: 'شراء إطار الأفاتار', en: 'Avatar Frame Purchase' },
  };

  const label = labels[eventType];
  return label ? (isArabic ? label.ar : label.en) : (isArabic ? 'تحديث مكافآت' : 'Reward update');
}

export function getRewardEntryDetail(metadata: Record<string, unknown> | undefined, isAr: boolean | string): string | null {
  const isArabic = typeof isAr === 'boolean' ? isAr : isAr === 'ar';
  const value = metadata?.quiz_title || metadata?.title || metadata?.item_name || metadata?.challenge_name;
  if (typeof value !== 'string' || !value.trim()) return null;
  return isArabic ? `عن: ${value}` : `For: ${value}`;
}
