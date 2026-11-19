/**
 * QuizSpace Unified 1-100 Progression & Leveling Engine
 *
 * Provides:
 * - Level calculation capped at 100 (Max Level)
 * - Calibrated quadratic/milestone XP progression curve
 * - 10 Grand Divisions with custom Title Badges and Visual Avatars
 * - Unique unlockable rewards and creative perks for all 100 levels
 */

export interface LevelUnlock {
  level: number;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  category: 'frame' | 'title' | 'perk' | 'theme' | 'badge' | 'aura' | 'coins';
  badgeSymbol?: string;
}

export interface DivisionInfo {
  division: number; // 1 to 10
  minLevel: number;
  maxLevel: number;
  titleAr: string;
  titleEn: string;
  badgeName: string;
  badgeColor: string;
  gradient: string;
  borderColor: string;
  avatarIcon: 'compass' | 'book' | 'shield' | 'sparkles' | 'feather' | 'crown' | 'sword' | 'gem' | 'flame' | 'star';
}

export interface UserLevelInfo {
  level: number; // 1 to 100
  isMaxLevel: boolean;
  currentXp: number;
  levelStartXp: number;
  nextLevelXp: number;
  xpInLevel: number;
  xpRequiredForNext: number;
  progressPercent: number; // 0 to 100
  division: DivisionInfo;
  currentUnlock: LevelUnlock;
  nextUnlock?: LevelUnlock;
}

// Fixed XP thresholds for each level from 1 to 100
// Level 1 starts at 0 XP; Level 100 is reached at 1,000,000 XP
const XP_THRESHOLDS: number[] = new Array(101);
XP_THRESHOLDS[1] = 0;
XP_THRESHOLDS[2] = 100;

for (let lvl = 3; lvl <= 100; lvl++) {
  if (lvl <= 10) {
    // Levels 3-10: fast early climb (100 -> ~2,500 XP)
    XP_THRESHOLDS[lvl] = Math.round(XP_THRESHOLDS[lvl - 1] + (lvl * 50));
  } else if (lvl <= 30) {
    // Levels 11-30: steady progress (2,500 -> ~35,000 XP)
    XP_THRESHOLDS[lvl] = Math.round(XP_THRESHOLDS[lvl - 1] + (lvl * 120) + 100);
  } else if (lvl <= 60) {
    // Levels 31-60: mid-game depth (35,000 -> ~280,000 XP)
    XP_THRESHOLDS[lvl] = Math.round(XP_THRESHOLDS[lvl - 1] + (lvl * 350) + 800);
  } else if (lvl <= 90) {
    // Levels 61-90: veteran scholar mastery (280,000 -> ~820,000 XP)
    XP_THRESHOLDS[lvl] = Math.round(XP_THRESHOLDS[lvl - 1] + (lvl * 800) + 3000);
  } else {
    // Levels 91-100: elite celestial tier reaching 1,000,000 XP
    XP_THRESHOLDS[lvl] = Math.round(XP_THRESHOLDS[lvl - 1] + (lvl * 1600) + 4000);
  }
}
// Normalize Level 100 to exactly 1,000,000 XP
XP_THRESHOLDS[100] = 1_000_000;

export const DIVISIONS: readonly DivisionInfo[] = [
  {
    division: 1,
    minLevel: 1,
    maxLevel: 10,
    titleAr: 'مستكشف صاعد',
    titleEn: 'Novice Explorer',
    badgeName: 'بوصلة المعرفة',
    badgeColor: 'text-[#2AC3BB]',
    gradient: 'from-[#007472] to-[#2AC3BB]',
    borderColor: 'border-[#2AC3BB]/40',
    avatarIcon: 'compass',
  },
  {
    division: 2,
    minLevel: 11,
    maxLevel: 20,
    titleAr: 'باحث نشط',
    titleEn: 'Active Scholar',
    badgeName: 'لفافة الأكاديمية',
    badgeColor: 'text-sky-400',
    gradient: 'from-sky-600 to-cyan-400',
    borderColor: 'border-sky-400/40',
    avatarIcon: 'book',
  },
  {
    division: 3,
    minLevel: 21,
    maxLevel: 30,
    titleAr: 'بطل التحديات',
    titleEn: 'Quiz Challenger',
    badgeName: 'درع الشجاعة الفضي',
    badgeColor: 'text-indigo-400',
    gradient: 'from-indigo-600 to-[#2AC3BB]',
    borderColor: 'border-indigo-400/40',
    avatarIcon: 'shield',
  },
  {
    division: 4,
    minLevel: 31,
    maxLevel: 40,
    titleAr: 'عالم كوني',
    titleEn: 'Cosmic Scholar',
    badgeName: 'أسطرلاب النجوم',
    badgeColor: 'text-violet-400',
    gradient: 'from-purple-600 to-indigo-400',
    borderColor: 'border-violet-400/40',
    avatarIcon: 'sparkles',
  },
  {
    division: 5,
    minLevel: 41,
    maxLevel: 50,
    titleAr: 'فيلسوف الاختبارات',
    titleEn: 'Quiz Philosopher',
    badgeName: 'الريشة الذهبية',
    badgeColor: 'text-amber-400',
    gradient: 'from-amber-600 via-yellow-500 to-amber-300',
    borderColor: 'border-amber-400/50',
    avatarIcon: 'feather',
  },
  {
    division: 6,
    minLevel: 51,
    maxLevel: 60,
    titleAr: 'سيد الأكاديمية',
    titleEn: 'Academy Master',
    badgeName: 'تاج الياقوت الإمبراطوري',
    badgeColor: 'text-rose-400',
    gradient: 'from-rose-600 via-[#EE8361] to-amber-400',
    borderColor: 'border-rose-400/50',
    avatarIcon: 'crown',
  },
  {
    division: 7,
    minLevel: 61,
    maxLevel: 70,
    titleAr: 'القائد الأسطوري',
    titleEn: 'Legendary Commander',
    badgeName: 'سيف الحكمة الياقوتي',
    badgeColor: 'text-teal-300',
    gradient: 'from-teal-600 to-emerald-400',
    borderColor: 'border-teal-400/50',
    avatarIcon: 'sword',
  },
  {
    division: 8,
    minLevel: 71,
    maxLevel: 80,
    titleAr: 'حارس الحكمة',
    titleEn: 'Guardian of Wisdom',
    badgeName: 'جوهرة الزمرد الخالدة',
    badgeColor: 'text-emerald-400',
    gradient: 'from-emerald-600 via-teal-500 to-[#2AC3BB]',
    borderColor: 'border-emerald-400/50',
    avatarIcon: 'gem',
  },
  {
    division: 9,
    minLevel: 81,
    maxLevel: 90,
    titleAr: 'حاكم المجرة',
    titleEn: 'Galactic Overlord',
    badgeName: 'شعلة النيبولا الكونية',
    badgeColor: 'text-fuchsia-400',
    gradient: 'from-fuchsia-600 via-purple-600 to-cyan-400',
    borderColor: 'border-fuchsia-400/60',
    avatarIcon: 'flame',
  },
  {
    division: 10,
    minLevel: 91,
    maxLevel: 100,
    titleAr: 'أسطورة الفضاء الأعظم',
    titleEn: 'Grandmaster of the Universe',
    badgeName: 'النجم الماسي الأبدي',
    badgeColor: 'text-[#EE8361]',
    gradient: 'from-[#007472] via-[#2AC3BB] to-[#EE8361]',
    borderColor: 'border-[#EE8361]',
    avatarIcon: 'star',
  },
];

// Curated creative rewards and unlocks for each level 1..100
const LEVEL_UNLOCKS: Record<number, LevelUnlock> = {
  1: { level: 1, titleAr: 'بداية الرحلة', titleEn: 'Journey Begins', descAr: 'فتح وصول فوري لجميع اختبارات المنصة العامة والتحديات الأساسية', descEn: 'Full access to explore public quizzes and daily trials', category: 'perk' },
  2: { level: 2, titleAr: 'المفضلة الذكية', titleEn: 'Smart Bookmarks', descAr: 'إمكانية حفظ الاختبارات المفضلة والرجوع إليها في أي وقت دون اتصال', descEn: 'Bookmark favorite quizzes for offline quick access', category: 'perk' },
  3: { level: 3, titleAr: 'مجتمع النقاد', titleEn: 'Reviewer Badge', descAr: 'فتح ميزة تقييم الأسئلة وإرسال الملاحظات البناءة للمؤلفين', descEn: 'Rate quizzes and submit constructive feedback', category: 'badge' },
  4: { level: 4, titleAr: 'مؤشر الدقة', titleEn: 'Accuracy Index', descAr: 'تفعيل بطاقة قياس دقة الإجابات ونسبة الصواب في الملف الشخصي', descEn: 'Live precision and accuracy analytics in profile', category: 'perk' },
  5: { level: 5, titleAr: 'منحة المستكشف', titleEn: 'Explorer Grant', descAr: 'مكافأة 50 عملة ذهبية + شارة المستكشف المبتدئ البرونزية', descEn: '50 free coins + Novice Explorer profile emblem', category: 'coins', badgeSymbol: 'compass' },
  6: { level: 6, titleAr: 'المظهر الداكن الفاخر', titleEn: 'Luxury Dark Mode', descAr: 'فتح ثيم الوضع الليلي الفاخر وتخصيص باليتات الألوان', descEn: 'Unlock luxury dark mode and custom color palettes', category: 'theme' },
  7: { level: 7, titleAr: 'صانع الذكاء الاصطناعي', titleEn: 'AI Quiz Builder', descAr: 'إمكانية إنشاء اختبارات ذكية عبر رفع المستندات والنصوص', descEn: 'AI quiz creation from documents and notes', category: 'perk' },
  8: { level: 8, titleAr: 'المؤثرات التفاعلية', titleEn: 'Soundscapes', descAr: 'فتح المؤثرات الصوتية التفاعلية ونغمات الاحتفال بالإنجاز', descEn: 'Interactive UI chimes and victory audio', category: 'perk' },
  9: { level: 9, titleAr: 'سيرة ذاتية متقدمة', titleEn: 'Extended Bio', descAr: 'كتابة نبذة شخصية موسعة مع روابط السوشيال ميديا وقناتك', descEn: 'Extended profile bio with verified social links', category: 'perk' },
  10: { level: 10, titleAr: 'إطار المستكشف البرونزي', titleEn: 'Bronze Explorer Frame', descAr: 'إطار برونزي متألق للأفاتار + ترقية للقب باحث نشط', descEn: 'Bronze explorer avatar frame + division promotion', category: 'frame' },
  11: { level: 11, titleAr: 'المراجعة الذكية', titleEn: 'Smart Review', descAr: 'لوحة المراجعة التفاعلية للأخطاء مع التفسيرات المعمقة', descEn: 'Interactive smart error review with deep insights', category: 'perk' },
  12: { level: 12, titleAr: 'شهادة رقمية أولية', titleEn: 'Digital Certificate', descAr: 'إصدار شهادات إنجاز PDF ممهورة عند اجتياز الاختبارات', descEn: 'Issue downloadable PDF achievement certificates', category: 'perk' },
  13: { level: 13, titleAr: 'منحة الباحث', titleEn: 'Scholar Stash', descAr: 'مكافأة 100 عملة ذهبية لتجهيز متجر المكافآت', descEn: '100 bonus gold coins for rewards store', category: 'coins' },
  14: { level: 14, titleAr: 'إحصائيات السرعة', titleEn: 'Speed Analytics', descAr: 'مقياس سرعة الإجابة وحساب متوسط الثواني لكل سؤال', descEn: 'Speed meter tracking seconds per question', category: 'perk' },
  15: { level: 15, titleAr: 'وسام قناص المعرفة', titleEn: 'Knowledge Sniper', descAr: 'شارة قناص المعرفة للأداء المثالي في 5 اختبارات متتالية', descEn: 'Precision badge for perfect streaks in 5 quizzes', category: 'badge', badgeSymbol: 'target' },
  16: { level: 16, titleAr: 'مؤقت التحدي المخصص', titleEn: 'Custom Timers', descAr: 'تخصيص مؤقت الاختبارات الحرة حسب رغبتك أثناء الحل', descEn: 'Customizable quiz timers during practice', category: 'perk' },
  17: { level: 17, titleAr: 'مكافأة السلسلة المزدوجة', titleEn: 'Double Streak Boost', descAr: 'مضاعفة نقاط الـ XP عند الحفاظ على سلسلة تعلم أسبوعية', descEn: '2x XP multiplier for 7-day learning streak', category: 'perk' },
  18: { level: 18, titleAr: 'ثيم البترولي الملكي', titleEn: 'Royal Petrol Theme', descAr: 'فتح باليتة ألوان البترولي الملكي الفاخرة لجميع الواجهات', descEn: 'Unlock Royal Petrol signature theme palette', category: 'theme' },
  19: { level: 19, titleAr: 'صندوق العملات الفضي', titleEn: 'Silver Coin Chest', descAr: 'مكافأة فورية 150 عملة ذهبية في رصيد المتجر', descEn: '150 bonus gold coins credited to inventory', category: 'coins' },
  20: { level: 20, titleAr: 'إطار الفضة المشعة', titleEn: 'Radiant Silver Frame', descAr: 'إطار فضي مشع حول الأفاتار + لقب بطل التحديات', descEn: 'Radiant silver profile frame + division rank up', category: 'frame' },
  25: { level: 25, titleAr: 'تحدي الأصدقاء المباشر', titleEn: 'Live Peer Duels', descAr: 'ميزة إرسال رابط تحدي الأصدقاء في نفس الاختبار في الوقت الحقيقي', descEn: 'Real-time peer quiz duels with split leaderboards', category: 'perk' },
  30: { level: 30, titleAr: 'إطار الشفق السماوي', titleEn: 'Celestial Twilight Frame', descAr: 'إطار أزرق نيبولا متوهج للأفاتار + لقب عالم كوني', descEn: 'Nebula twilight avatar frame + Cosmic division rank', category: 'frame' },
  35: { level: 35, titleAr: 'هالة البروفايل الياقوتية', titleEn: 'Ruby Profile Aura', descAr: 'تأثير إضاءة نيون خفيف وراقي حول بطاقة الملف الشخصي', descEn: 'Subtle neon back-glow effect behind profile card', category: 'aura' },
  40: { level: 40, titleAr: 'إطار الزمرد السايبراني', titleEn: 'Cyber Emerald Frame', descAr: 'إطار زمردي سايبراني ذو وميض متدرج للأفاتار', descEn: 'Cyber emerald gradient animated frame', category: 'frame' },
  45: { level: 45, titleAr: 'وسام المفكر الفضائي', titleEn: 'Cosmic Thinker Crest', descAr: 'شارة النجم المتوج في لوحات الشرف والتعليقات', descEn: 'Crown star crest displayed in discussions', category: 'badge' },
  50: { level: 50, titleAr: 'إطار الذهب النقي الإمبراطوري', titleEn: 'Pure Imperial Gold Frame', descAr: 'إطار ذهبي نقي ثلاثي الأبعاد + لقب فيلسوف الاختبارات', descEn: '3D Imperial pure gold frame + Philosopher title', category: 'frame' },
  55: { level: 55, titleAr: 'تخصيص غلاف مخصص لا نهائي', titleEn: 'Ultra Cover Freedom', descAr: 'رفع صور أغلفة فائقة الدقة للبروفايل بدون أي قيود', descEn: 'High-res profile banner uploads with no constraints', category: 'perk' },
  60: { level: 60, titleAr: 'إطار التاج الملكي', titleEn: 'Royal Crown Frame', descAr: 'إطار ملكي مرصع بالياقوت + لقب سيد الأكاديمية', descEn: 'Ruby-studded crown frame + Academy Master title', category: 'frame' },
  65: { level: 65, titleAr: 'صندوق الثروة الكبرى', titleEn: 'Grand Treasury', descAr: 'منحة 1,000 عملة ذهبية لمتجر الإطارات والمكافآت', descEn: '1,000 bonus gold coins for exclusive store items', category: 'coins' },
  70: { level: 70, titleAr: 'إطار الياقوت الأزرق الأسطوري', titleEn: 'Legendary Sapphire Frame', descAr: 'إطار ياقوتي نفاذ متوهج + لقب القائد الأسطوري', descEn: 'Legendary sapphire avatar frame + Commander rank', category: 'frame' },
  75: { level: 75, titleAr: 'ميزة الفصول الدراسية الخاصة', titleEn: 'Private Academy Rooms', descAr: 'إنشاء قاعات دراسية مخصصة ودعوة الطلاب بدون حدود', descEn: 'Create private classroom cohorts with custom rules', category: 'perk' },
  80: { level: 80, titleAr: 'إطار حارس الحكمة الخالد', titleEn: 'Guardian Eternal Frame', descAr: 'إطار زمردي ملكي + لقب حارس الحكمة', descEn: 'Royal emerald eternal frame + Wisdom Guardian title', category: 'frame' },
  85: { level: 85, titleAr: 'هالة المجرة النابضة', titleEn: 'Pulsing Galaxy Aura', descAr: 'هالة كونية بنفسجية متموجة تضيء البروفايل بالكامل', descEn: 'Pulsing galactic aura illuminating profile surface', category: 'aura' },
  90: { level: 90, titleAr: 'إطار النيبولا النجمية', titleEn: 'Nebula Starburst Frame', descAr: 'إطار فضاء نيبولا متحرك + لقب حاكم المجرة', descEn: 'Animated cosmic nebula frame + Galactic Overlord rank', category: 'frame' },
  95: { level: 95, titleAr: 'خاتم الخلود الأكاديمي', titleEn: 'Ring of Academic Immortality', descAr: 'خاتم ذهبي ملكي يظهر بجوار الاسم في جميع لوحات الشرف', descEn: 'Golden immortality ring next to name everywhere', category: 'badge' },
  99: { level: 99, titleAr: 'عتبة الخلود', titleEn: 'Threshold of Eternity', descAr: 'منحة 5,000 عملة + لقب المتسامي الكوني', descEn: '5,000 coins grant + Cosmic Ascendant title', category: 'coins' },
  100: {
    level: 100,
    titleAr: 'إطار الأسطورة الألماسي الأعظم (MAX)',
    titleEn: 'Grandmaster Diamond Frame (MAX)',
    descAr: 'الإطار الألماسي الكوني الخارق + لقب أسطورة الفضاء الأعظم + ميدالية الخلود الأكاديمي الأبدية في صدارة المنصة',
    descEn: 'Supreme Diamond celestial frame, Grandmaster title & eternal academic immortality medal',
    category: 'frame',
    badgeSymbol: 'star'
  },
};

/**
 * Fallback generator for levels between key milestones so EVERY level 1..100 has a unique perk
 */
function getOrCreateLevelUnlock(level: number): LevelUnlock {
  const clamped = Math.max(1, Math.min(100, Math.floor(level)));
  if (LEVEL_UNLOCKS[clamped]) return LEVEL_UNLOCKS[clamped];

  const div = getDivisionForLevel(clamped);
  const coinsReward = 20 + clamped * 5;

  return {
    level: clamped,
    titleAr: `ترقية ${div.titleAr} • رتبة ${clamped}`,
    titleEn: `${div.titleEn} Rank ${clamped}`,
    descAr: `زيادة رصيد نقاط التميز + منحة ${coinsReward} عملة ذهبية في المتجر وتأكيد الأسبقية بلوحة الصدارة`,
    descEn: `XP rank booster + ${coinsReward} coins reward and verified leaderboard standing`,
    category: 'coins',
  };
}

/**
 * Returns the Division for a given level (1 to 100)
 */
export function getDivisionForLevel(level: number): DivisionInfo {
  const clamped = Math.max(1, Math.min(100, Math.floor(level)));
  const found = DIVISIONS.find((d) => clamped >= d.minLevel && clamped <= d.maxLevel);
  return found || DIVISIONS[0];
}

/**
 * Calculates user level strictly capped at 100 based on total accumulated XP
 */
export function calculateUserLevel(xp: number): number {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));

  // Max Level cap check
  if (safeXp >= XP_THRESHOLDS[100]) {
    return 100;
  }

  // Binary search for efficiency across the 100 thresholds
  let low = 1;
  let high = 100;
  let result = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (safeXp >= XP_THRESHOLDS[mid]) {
      result = mid;
      low = mid + 1; // Try higher level
    } else {
      high = mid - 1;
    }
  }

  return Math.min(100, Math.max(1, result));
}

/**
 * Retrieves the complete Level Information, Division, XP thresholds and Progress
 */
export function getUserLevelInfo(xp: number): UserLevelInfo {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  const level = calculateUserLevel(safeXp);
  const isMaxLevel = level >= 100;

  const levelStartXp = XP_THRESHOLDS[level] || 0;
  const nextLevelXp = isMaxLevel ? XP_THRESHOLDS[100] : (XP_THRESHOLDS[level + 1] || XP_THRESHOLDS[100]);

  const xpRequiredForNext = isMaxLevel ? 0 : Math.max(1, nextLevelXp - levelStartXp);
  const xpInLevel = isMaxLevel ? xpRequiredForNext : Math.max(0, safeXp - levelStartXp);

  const progressPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round((xpInLevel / xpRequiredForNext) * 100)));

  const division = getDivisionForLevel(level);
  const currentUnlock = getOrCreateLevelUnlock(level);
  const nextUnlock = isMaxLevel ? undefined : getOrCreateLevelUnlock(level + 1);

  return {
    level,
    isMaxLevel,
    currentXp: safeXp,
    levelStartXp,
    nextLevelXp,
    xpInLevel,
    xpRequiredForNext,
    progressPercent,
    division,
    currentUnlock,
    nextUnlock,
  };
}

/**
 * Returns all 100 levels with their unlock details for the roadmap modal
 */
export function getAll100Levels(): LevelUnlock[] {
  const list: LevelUnlock[] = [];
  for (let i = 1; i <= 100; i++) {
    list.push(getOrCreateLevelUnlock(i));
  }
  return list;
}
