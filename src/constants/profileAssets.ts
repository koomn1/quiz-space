export type AvatarGender = 'boy' | 'girl';

export interface AvatarPreset {
  id: string;
  label: string;
  labelAr: string;
  gender: AvatarGender;
  url: string;
}

const LEGACY_PROFILE_ASSET_ALIASES: Record<string, string> = {
  'avatars/avatar-football-pro.webp': 'clean-assets-replacement/boy-robotics-transparent.webp',
  'avatars/girl-studying-activity.webp': 'clean-assets-replacement/girl-pottery-transparent.webp',
  'avatars/avatar-music-pro.webp': 'clean-assets-replacement/boy-chef-transparent.webp',
  'avatars/girl-school-walk.webp': 'clean-assets-replacement/girl-cycling-transparent.webp',
  'avatars/avatar-skater-pro.webp': 'clean-assets-replacement/girl-dance-transparent.webp',
  'avatars/new_girl_avatar.webp': 'clean-assets-replacement/girl-pottery-transparent.webp',
  'clean-assets-deterministic/avatar-football-pro-transparent.webp': 'clean-assets-replacement/boy-robotics-transparent.webp',
  'clean-assets-deterministic/girl-studying-activity-transparent.webp': 'clean-assets-replacement/girl-pottery-transparent.webp',
  'clean-assets-deterministic/avatar-music-pro-transparent.webp': 'clean-assets-replacement/boy-chef-transparent.webp',
  'clean-assets-deterministic/girl-school-walk-transparent.webp': 'clean-assets-replacement/girl-cycling-transparent.webp',
  'clean-assets-deterministic/avatar-skater-pro-transparent.webp': 'clean-assets-replacement/girl-dance-transparent.webp',
  'clean-assets-deterministic/new_girl_avatar-transparent.webp': 'clean-assets-replacement/girl-pottery-transparent.webp',
  'frame-diamond-comet_596fd1b8.webp': 'clean-assets-replacement/galaxy-ring-transparent.webp',
  'frame-diamond-crown_c3f3f17c.webp': 'clean-assets-replacement/cyber-orbit-transparent.webp',
  'frame-ramadan-crescent_1c3d1be8.webp': 'clean-assets-replacement/ramadan-green-transparent.webp',
  'frame-back-school_68d31549.webp': 'clean-assets-replacement/school-bus-transparent.webp',
  'images/frame-free-1.webp': 'clean-assets-replacement/nature-leaf-transparent.webp',
  'images/frame-free-2.webp': 'clean-assets-replacement/aurora-glass-transparent.webp',
  'images/frame-diamond-halo.webp': 'clean-assets-replacement/galaxy-ring-transparent.webp',
  'images/frame-dragon.webp': 'clean-assets-replacement/fire-trail-transparent.webp',
  'images/frame-neon-orbit.webp': 'clean-assets-replacement/neon-orbit-transparent.webp',
  'images/frame-aurora.webp': 'clean-assets-replacement/aurora-glass-transparent.webp',
  'images/frame-fire.webp': 'clean-assets-replacement/fire-trail-transparent.webp',
  'images/frame-crystal-luxe.webp': 'clean-assets-replacement/crystal-luxe-transparent.webp',
  'images/frame-star-crown.webp': 'clean-assets-replacement/star-crown-transparent.webp',
  'images/frame-nature-leaf.webp': 'clean-assets-replacement/nature-leaf-transparent.webp',
  'images/frame-galaxy.webp': 'clean-assets-replacement/galaxy-ring-transparent.webp',
  'images/frame-cyber-punk.webp': 'clean-assets-replacement/cyber-orbit-transparent.webp',
  'images/frame-ramadan-green.webp': 'clean-assets-replacement/ramadan-green-transparent.webp',
  'images/frame-school-bus.webp': 'clean-assets-replacement/school-bus-transparent.webp',
  'images/frame-school-stationary.webp': 'clean-assets-replacement/school-stationary-transparent.webp',
};

export function profileAssetUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const raw = String(path || '').trim();
  const githubPagesPath = raw.match(/^(?:https?:)?\/\/koomn1\.github\.io\/quiz-space\/(.+)$/i)?.[1];
  const localPath = githubPagesPath || raw;
  if (/^(https?:|data:)?\/\//.test(localPath) || localPath.startsWith('data:')) return raw;
  const normalized = localPath
    .replace(/^\/?manus-storage\//, '')
    .replace(/^\.?\//, '')
    .replace(/^\/?(?:quiz-space\/)+/i, '')
    .replace(/^\//, '');
  const aliased = LEGACY_PROFILE_ASSET_ALIASES[normalized];
  if (aliased) return `${base}${aliased}`;
  if (localPath.startsWith('/manus-storage/')) return `${base}clean-assets-replacement/aurora-glass-transparent.webp`;
  return `${base}${normalized}`;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'boy-robotics', label: 'Robotics', labelAr: 'مختبر الروبوتات', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/avatar-robotics-student.webp') },
  { id: 'girl-pottery', label: 'Pottery', labelAr: 'الفخار', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/girl-pottery-transparent.webp') },
  { id: 'boy-music-student', label: 'Music Producer', labelAr: 'منتج موسيقي', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/avatar-music-student.webp') },
  { id: 'girl-dance', label: 'Dance', labelAr: 'الرقص', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/girl-dance-transparent.webp') },
  { id: 'boy-photography', label: 'Photography', labelAr: 'التصوير', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/boy-photography-transparent.webp') },
  { id: 'girl-cycling', label: 'Cycling', labelAr: 'ركوب الدراجة', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/girl-cycling-transparent.webp') },
  { id: 'girl-robotics-v2', label: 'Robotics Explorer', labelAr: 'مستكشفة الروبوتات', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/avatar-girl-robotics-v2.webp') },
  { id: 'boy-football-science-v2', label: 'Football & Science', labelAr: 'كرة وعلوم', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/avatar-boy-football-analyst-v2.webp') },
  { id: 'girl-design-v2', label: 'Digital Designer', labelAr: 'مصممة رقمية', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/avatar-girl-design-artist-v2.webp') },
  { id: 'boy-music-walker-v2', label: 'Music Walk', labelAr: 'موسيقى ومشوار', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/avatar-boy-music-walker-v2.webp') },
  { id: 'girl-astronomy-v2', label: 'Astronomy', labelAr: 'فلك ومراصد', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/avatar-girl-astronomy-v2.webp') },
  { id: 'boy-chess-strategist-v3', label: 'Chess Strategist', labelAr: 'استراتيجي الشطرنج', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/avatar-boy-chess-strategist-v3.webp') },
  { id: 'girl-basketball-science-v3', label: 'Basketball & Science', labelAr: 'كرة سلة وعلوم', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/avatar-girl-basketball-scientist-v3.webp') },
  { id: 'boy-photo-journalist-v3', label: 'Student Photographer', labelAr: 'مصور المدرسة', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/avatar-boy-photo-journalist-v3.webp') },
  { id: 'girl-cyclist-coder-v3', label: 'Cyclist Coder', labelAr: 'مستكشفة البرمجة', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/avatar-girl-cyclist-coder-v3.webp') },
  // Crisp vector avatars — always sharp at every size and theme.
  { id: 'svg-boy-astronaut', label: 'Astronaut', labelAr: 'رائد فضاء', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/svg-avatars/svg-boy-astronaut.svg') },
  { id: 'svg-boy-king', label: 'Golden King', labelAr: 'الملك الذهبي', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/svg-avatars/svg-boy-king.svg') },
  { id: 'svg-boy-ninja', label: 'Shadow Ninja', labelAr: 'النينجا الشبح', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/svg-avatars/svg-boy-ninja.svg') },
  { id: 'svg-boy-wizard', label: 'Wizard', labelAr: 'الساحر', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/svg-avatars/svg-boy-wizard.svg') },
  { id: 'svg-boy-robot', label: 'Cyber Bot', labelAr: 'الروبوت السيبراني', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/svg-avatars/svg-boy-robot.svg') },
  { id: 'svg-girl-queen', label: 'Rose Queen', labelAr: 'ملكة الورد', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/svg-avatars/svg-girl-queen.svg') },
  { id: 'svg-girl-star', label: 'Super Star', labelAr: 'النجمة الساطعة', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/svg-avatars/svg-girl-star.svg') },
  { id: 'svg-girl-butterfly', label: 'Nature Spirit', labelAr: 'روح الطبيعة', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/svg-avatars/svg-girl-butterfly.svg') },
];

export const AVATAR_PRESET_URLS = AVATAR_PRESETS.map((avatar) => avatar.url);

export function resolveProfileImageUrl(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (/^data:image\//i.test(raw)) return raw;

  // Profile rows created by the old deployments may contain either an
  // absolute z-space URL or a stale /quiz-space/ base. Convert only our own
  // app hosts; leave third-party avatars (Google/GitHub/etc.) untouched.
  const ownAppAsset = raw.match(/^https?:\/\/(?:z-space-app|quiz-space-app)\.pages\.dev\/(?:quiz-space\/)?(.+)$/i);
  if (ownAppAsset?.[1]) return profileAssetUrl(ownAppAsset[1]);
  if (/^(?:https?:)?\/\//i.test(raw) && !/^(?:https?:)?\/\/koomn1\.github\.io\/quiz-space\//i.test(raw)) return raw;
  if (!raw || /(?:^|\/)\b(?:boy|girl)(?:-cartoon)?-[1-6]\.(?:png|webp)$/i.test(raw)) {
    return AVATAR_PRESETS[0]?.url || profileAssetUrl('clean-assets-deterministic/avatar-football-pro-transparent.webp');
  }
  return profileAssetUrl(raw);
}

export function getDefaultAvatar(name: string): string {
  const femaleIndicators = [
    'فاطم', 'عائش', 'مريم', 'نور', 'سارة', 'هند', 'ريم', 'دانة', 'لجين', 'تالا',
    'جوري', 'جنى', 'لمى', 'رنا', 'منى', 'هدى', 'سلمى', 'ياسمين', 'ندى', 'أمل',
    'fatima', 'aisha', 'maryam', 'noor', 'sara', 'sarah', 'hala', 'reem', 'lujain',
    'fat', 'mar', 'sal', 'nur', 'hin', 'dan', 'ama', 'han', 'yasm', 'lay', 'jul',
  ];
  const isFemale = femaleIndicators.some((indicator) => name.toLowerCase().includes(indicator));
  const candidates = AVATAR_PRESETS.filter((avatar) => avatar.gender === (isFemale ? 'girl' : 'boy'));
  return candidates[Math.floor(Math.random() * candidates.length)]?.url || AVATAR_PRESETS[0].url;
}

export interface ProfileFrame {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  image_url: string;
  css_class?: string | null;
  is_free?: boolean;
}

export const FREE_PROFILE_FRAMES: ProfileFrame[] = [
  {
    id: 'frame_free_1',
    name: 'Soft Halo',
    name_ar: 'هالة ناعمة',
    image_url: profileAssetUrl('clean-assets-replacement/nature-leaf-transparent.webp'),
    css_class: 'frame-nature-leaf',
    is_free: true,
  },
  {
    id: 'frame_free_2',
    name: 'Clean Mint',
    name_ar: 'نعناع هادئ',
    image_url: profileAssetUrl('clean-assets-replacement/aurora-glass-transparent.webp'),
    css_class: 'frame-aurora-glass',
    is_free: true,
  },
  {
    id: 'frame_aurora_neon',
    name: 'Neon Aurora',
    name_ar: 'الشفق النيوني',
    image_url: profileAssetUrl('clean-assets-replacement/svg-avatars/frame-aurora-neon.svg'),
    css_class: 'frame-aurora-neon',
    is_free: true,
  },
  {
    id: 'frame_royal_ember',
    name: 'Royal Ember',
    name_ar: 'الجمر الملكي',
    image_url: profileAssetUrl('clean-assets-replacement/svg-avatars/frame-royal-ember.svg'),
    css_class: 'frame-royal-ember',
    is_free: true,
  },
  {
    id: 'frame_cosmic_pulse',
    name: 'Cosmic Pulse',
    name_ar: 'نبض الكون',
    image_url: profileAssetUrl('clean-assets-replacement/svg-avatars/frame-cosmic-pulse.svg'),
    css_class: 'frame-cosmic-pulse',
    is_free: true,
  },
  {
    id: 'frame_cyber_eagle',
    name: 'Cyber Eagle',
    name_ar: 'النسر السيبراني',
    image_url: profileAssetUrl('clean-assets-replacement/frame-cyber-eagle-transparent.webp'),
    css_class: 'frame-cyber-eagle',
    is_free: true,
  },
  {
    id: 'frame_ice_dragon',
    name: 'Ice Dragon',
    name_ar: 'تنين الجليد',
    image_url: profileAssetUrl('clean-assets-replacement/frame-ice-dragon-transparent.webp'),
    css_class: 'frame-ice-dragon',
    is_free: true,
  },
  {
    id: 'frame_dual_dragon',
    name: 'Dual Dragon',
    name_ar: 'التنين المزدوج',
    image_url: profileAssetUrl('clean-assets-replacement/frame-dual-dragon-transparent.webp'),
    css_class: 'frame-dual-dragon',
    is_free: true,
  },
  {
    id: 'frame_sea_crown',
    name: 'Sea Crown',
    name_ar: 'تاج البحر',
    image_url: profileAssetUrl('clean-assets-replacement/frame-sea-crown-transparent.webp'),
    css_class: 'frame-sea-crown',
    is_free: true,
  },
  {
    id: 'frame_cyber_ice_ring',
    name: 'Cyber Ice Ring',
    name_ar: 'حلقة الجليد السيبرانية',
    image_url: profileAssetUrl('clean-assets-replacement/frame-cyber-ice-ring-transparent.webp'),
    css_class: 'frame-cyber-ice-ring',
    is_free: true,
  },
  {
    id: 'frame_inferno_spike',
    name: 'Inferno Spike',
    name_ar: 'شوكة الجحيم',
    image_url: profileAssetUrl('clean-assets-replacement/frame-inferno-spike-transparent.webp'),
    css_class: 'frame-inferno-spike',
    is_free: true,
  },
  {
    id: 'frame_royal_emerald',
    name: 'Royal Emerald',
    name_ar: 'الزمرد الملكي',
    image_url: profileAssetUrl('clean-assets-replacement/frame-royal-emerald-transparent.webp'),
    css_class: 'frame-royal-emerald',
    is_free: true,
  },
  {
    id: 'frame_wolf_guardian',
    name: 'Wolf Guardian',
    name_ar: 'حارس الذئب',
    image_url: profileAssetUrl('clean-assets-replacement/frame-wolf-guardian-transparent.webp'),
    css_class: 'frame-wolf-guardian',
    is_free: true,
  },
  {
    id: 'frame_rose_thorn',
    name: 'Rose Thorn',
    name_ar: 'شوكة الورد',
    image_url: profileAssetUrl('clean-assets-replacement/frame-rose-thorn-transparent.webp'),
    css_class: 'frame-rose-thorn',
    is_free: true,
  },
];

export const FRAME_ASSET_OVERRIDES: Record<string, string> = {
  frame_free_1: profileAssetUrl('images/animated-frames/frame-nature-leaf.gif'),
  frame_free_2: profileAssetUrl('images/animated-frames/frame-aurora.gif'),
  frame_neon_orbit: profileAssetUrl('images/animated-frames/frame-neon-orbit.gif'),
  frame_aurora: profileAssetUrl('images/animated-frames/frame-aurora.gif'),
  frame_fire: profileAssetUrl('images/animated-frames/frame-fire.gif'),
  frame_crystal_luxe: profileAssetUrl('images/animated-frames/frame-crystal-luxe.gif'),
  frame_star_crown: profileAssetUrl('images/animated-frames/frame-star-crown.gif'),
  offer_vip_combo: profileAssetUrl('images/animated-frames/frame-star-crown.gif'),
  frame_diamond_comet: profileAssetUrl('images/animated-frames/frame-galaxy.gif'),
  frame_diamond_crown: profileAssetUrl('images/animated-frames/frame-neon-orbit.gif'),
  frame_diamond_halo: profileAssetUrl('images/animated-frames/frame-galaxy.gif'),
  frame_royal_gold: profileAssetUrl('images/animated-frames/frame-royal-gold.gif'),
  frame_cyber_punk: profileAssetUrl('images/animated-frames/frame-neon-orbit.gif'),
  frame_nature_leaf: profileAssetUrl('images/animated-frames/frame-nature-leaf.gif'),
  frame_galaxy: profileAssetUrl('images/animated-frames/frame-galaxy.gif'),
  frame_ramadan_gold: profileAssetUrl('images/animated-frames/frame-aurora.gif'),
  frame_ramadan_green: profileAssetUrl('images/animated-frames/frame-aurora.gif'),
  frame_ramadan_lantern: profileAssetUrl('images/animated-frames/frame-aurora.gif'),
  frame_school_stationary: profileAssetUrl('images/animated-frames/frame-school-bus.gif'),
  frame_school_bus: profileAssetUrl('images/animated-frames/frame-school-bus.gif'),
  frame_matrix: profileAssetUrl('images/animated-frames/frame-neon-orbit.gif'),
  frame_back_to_school: profileAssetUrl('images/animated-frames/frame-school-bus.gif'),
  frame_dragon_spirit: profileAssetUrl('images/animated-frames/frame-fire.gif'),
  frame_legendary_dragon: profileAssetUrl('images/animated-frames/frame-fire.gif'),
  frame_stone_royal: profileAssetUrl('images/animated-frames/frame-crystal-luxe.gif'),
  frame_stone_moon: profileAssetUrl('images/animated-frames/frame-crystal-luxe.gif'),
  frame_ice_glacier: profileAssetUrl('images/animated-frames/frame-crystal-luxe.gif'),
  frame_ice_frost: profileAssetUrl('images/animated-frames/frame-crystal-luxe.gif'),
  frame_aurora_neon: profileAssetUrl('images/animated-frames/frame-neon-orbit.gif'),
  frame_royal_ember: profileAssetUrl('images/animated-frames/frame-royal-gold.gif'),
  frame_cosmic_pulse: profileAssetUrl('images/animated-frames/frame-crystal-luxe.gif'),
};

export function uniqueProfileFrames<T extends { id?: string | null; image_url?: string | null }>(frames: T[]): T[] {
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  return frames.filter((frame) => {
    const id = String(frame.id || '').trim();
    const image = String(frame.image_url || '').trim();
    const resolvedImage = id && FRAME_ASSET_OVERRIDES[id] ? FRAME_ASSET_OVERRIDES[id] : image ? profileAssetUrl(image) : '';
    if (!id || seenIds.has(id) || (resolvedImage && seenImages.has(resolvedImage))) return false;
    seenIds.add(id);
    if (resolvedImage) seenImages.add(resolvedImage);
    return true;
  });
}

export function resolveFrameAsset(frame: { id?: string | null; image_url?: string | null }): string {
  const override = frame.id ? FRAME_ASSET_OVERRIDES[frame.id] : undefined;
  return override || profileAssetUrl(String(frame.image_url || ''));
}
