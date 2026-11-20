import { AvatarFrameItem } from '../types';

export interface LuxuryAvatarFrame extends AvatarFrameItem {
  description: string;
  descriptionAr: string;
  accentColor: string;
  glowColor: string;
  borderStyle: string;
}

export const LUXURY_AVATAR_FRAMES: LuxuryAvatarFrame[] = [
  {
    id: 'frame-petrol-obsidian',
    name: 'Petrol Obsidian',
    nameAr: 'حجر السج البترولي',
    priceCoins: 50,
    description: 'Petrol border with dark obsidian gloss',
    descriptionAr: 'إطار بترولي فاخر مع لمعان الأوبسيديان الداكن',
    accentColor: '#007472',
    glowColor: 'rgba(0, 116, 114, 0.7)',
    borderStyle: 'solid',
    frameClass:
      'border-4 border-[#007472] shadow-[0_0_20px_rgba(0,116,114,0.7)] bg-gradient-to-br from-[#072424]/90 to-[#001717]/90 ring-1 ring-[#007472]/40',
  },
  {
    id: 'frame-sand-ivory',
    name: 'Sand Ivory',
    nameAr: 'عاجي رملي',
    priceCoins: 75,
    description: 'Elegant sand/ivory gradient',
    descriptionAr: 'تدرج أنيق من الرمل والعاج الملكي',
    accentColor: '#FBDFC7',
    glowColor: 'rgba(251, 223, 199, 0.6)',
    borderStyle: 'solid',
    frameClass:
      'border-4 border-[#FBDFC7] shadow-[0_0_20px_rgba(251,223,199,0.6)] bg-gradient-to-br from-[#FBDFC7]/20 to-[#FCF6EE]/10 ring-2 ring-[#FCF6EE]/50',
  },
  {
    id: 'frame-bright-teal-neon',
    name: 'Bright Teal Neon',
    nameAr: 'تيل نيون مشع',
    priceCoins: 100,
    description: 'Bright Teal neon glow',
    descriptionAr: 'هالة نيون مشعة بلون التيل الساطع',
    accentColor: '#2AC3BB',
    glowColor: 'rgba(42, 195, 187, 0.85)',
    borderStyle: 'solid',
    frameClass:
      'border-4 border-[#2AC3BB] shadow-[0_0_25px_rgba(42,195,187,0.85)] bg-gradient-to-br from-[#2AC3BB]/20 to-[#007472]/30 ring-2 ring-[#2AC3BB]/60',
  },
  {
    id: 'frame-coral-flame',
    name: 'Coral Flame',
    nameAr: 'لهب المرجان',
    priceCoins: 200,
    description: 'Coral fiery aura',
    descriptionAr: 'شعلة نارية مهيبة بتدرج المرجان الدافئ',
    accentColor: '#EE8361',
    glowColor: 'rgba(238, 131, 97, 0.85)',
    borderStyle: 'solid',
    frameClass:
      'border-4 border-[#EE8361] shadow-[0_0_25px_rgba(238,131,97,0.85)] bg-gradient-to-br from-[#EE8361]/25 to-[#072424]/40 ring-2 ring-[#EE8361]/60',
  },
  {
    id: 'frame-golden-cosmo',
    name: 'Golden Cosmo',
    nameAr: 'كوزمو الذهبي',
    priceCoins: 350,
    description: 'Cosmic golden glow',
    descriptionAr: 'بريق ذهبي فلكي مستوحى من كوزمو',
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.9)',
    borderStyle: 'solid',
    frameClass:
      'border-4 border-[#F59E0B] shadow-[0_0_30px_rgba(245,158,11,0.9)] bg-gradient-to-br from-[#F59E0B]/20 to-[#B45309]/30 ring-2 ring-[#FBBF24]/70',
  },
  {
    id: 'frame-diamond-celestial',
    name: 'Diamond Celestial',
    nameAr: 'ألماس سماوي',
    priceCoins: 500,
    description: 'Prismatic diamond border',
    descriptionAr: 'إطار ألماسي منشوري سماوي فائق الفخامة',
    accentColor: '#E0F2FE',
    glowColor: 'rgba(224, 242, 254, 0.95)',
    borderStyle: 'solid',
    frameClass:
      'border-4 border-[#E0F2FE] shadow-[0_0_35px_rgba(224,242,254,0.95),0_0_20px_rgba(42,195,187,0.7)] bg-gradient-to-br from-white/20 to-[#2AC3BB]/20 ring-2 ring-white/80',
  },
];

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Restricted or sandbox environment
  }

  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    // Restricted environment
  }

  return null;
}

/**
 * Returns the list of all available luxury avatar frames in the catalog.
 */
export function getAvailableAvatarFrames(): AvatarFrameItem[] {
  return [...LUXURY_AVATAR_FRAMES];
}

/**
 * Checks whether a user has enough coins to purchase a frame.
 * Does NOT check XP or level.
 */
export function canPurchaseFrame(frameId: string, userCoins: number): boolean {
  const frame = LUXURY_AVATAR_FRAMES.find((f) => f.id === frameId);
  if (!frame) return false;
  return userCoins >= frame.priceCoins;
}

/**
 * Retrieves the list of frame IDs unlocked by the user from localStorage.
 */
export function getUserUnlockedFrames(userId: string): string[] {
  const storage = getStorage();
  if (!storage) return [];

  const key = `quizspace_user_frames_${userId}`;
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Unlocks an avatar frame for the user using Coins ONLY.
 * NEVER deducts XP or points.
 */
export async function unlockAvatarFrame(
  userId: string,
  frameId: string,
  currentCoins = 0
): Promise<{ success: boolean; newCoins: number; message?: string }> {
  const frame = LUXURY_AVATAR_FRAMES.find((f) => f.id === frameId);
  if (!frame) {
    return {
      success: false,
      newCoins: currentCoins,
      message: 'Frame not found in catalog',
    };
  }

  const unlocked = getUserUnlockedFrames(userId);
  if (unlocked.includes(frameId)) {
    return {
      success: true,
      newCoins: currentCoins,
      message: 'Frame already unlocked',
    };
  }

  if (currentCoins < frame.priceCoins) {
    return {
      success: false,
      newCoins: currentCoins,
      message: 'Insufficient Quiz Coins to purchase frame',
    };
  }

  const newCoins = currentCoins - frame.priceCoins;
  const updatedUnlocked = [...unlocked, frameId];
  const storage = getStorage();

  if (storage) {
    try {
      storage.setItem(
        `quizspace_user_frames_${userId}`,
        JSON.stringify(updatedUnlocked)
      );
    } catch {
      // Storage quota or error fallback
    }
  }

  return {
    success: true,
    newCoins,
    message: 'Frame unlocked successfully!',
  };
}

/**
 * Retrieves the currently active/equipped avatar frame ID for the user.
 */
export function getActiveAvatarFrame(userId: string): string | null {
  const storage = getStorage();
  if (!storage) return null;

  const key = `quizspace_active_avatar_frame_${userId}`;
  try {
    const val = storage.getItem(key);
    return val && val.trim() !== '' ? val : null;
  } catch {
    return null;
  }
}

/**
 * Sets the active avatar frame ID for the user.
 */
export function setActiveAvatarFrame(userId: string, frameId: string): void {
  const storage = getStorage();
  if (!storage) return;

  const key = `quizspace_active_avatar_frame_${userId}`;
  try {
    if (!frameId) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, frameId);
    }
  } catch {
    // Storage quota or error fallback
  }
}
