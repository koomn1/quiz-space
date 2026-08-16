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
  { id: 'boy-robotics', label: 'Robotics', labelAr: 'الروبوتات', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/boy-robotics-transparent.webp') },
  { id: 'girl-pottery', label: 'Pottery', labelAr: 'الفخار', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/girl-pottery-transparent.webp') },
  { id: 'boy-chef', label: 'Cooking', labelAr: 'الطبخ', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/boy-chef-transparent.webp') },
  { id: 'girl-dance', label: 'Dance', labelAr: 'الرقص', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/girl-dance-transparent.webp') },
  { id: 'boy-photography', label: 'Photography', labelAr: 'التصوير', gender: 'boy', url: profileAssetUrl('clean-assets-replacement/boy-photography-transparent.webp') },
  { id: 'girl-cycling', label: 'Cycling', labelAr: 'ركوب الدراجة', gender: 'girl', url: profileAssetUrl('clean-assets-replacement/girl-cycling-transparent.webp') },
];

export const AVATAR_PRESET_URLS = AVATAR_PRESETS.map((avatar) => avatar.url);

export function resolveProfileImageUrl(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (/^data:image\//i.test(raw)) return raw;
  if (/^(https?:)?\/\//i.test(raw) && !/^(?:https?:)?\/\/koomn1\.github\.io\/quiz-space\//i.test(raw)) return raw;
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
];

export const FRAME_ASSET_OVERRIDES: Record<string, string> = {
  frame_free_1: profileAssetUrl('clean-assets-replacement/nature-leaf-transparent.webp'),
  frame_free_2: profileAssetUrl('clean-assets-replacement/aurora-glass-transparent.webp'),
  frame_neon_orbit: profileAssetUrl('clean-assets-replacement/neon-orbit-transparent.webp'),
  frame_aurora: profileAssetUrl('clean-assets-replacement/aurora-glass-transparent.webp'),
  frame_fire: profileAssetUrl('clean-assets-replacement/fire-trail-transparent.webp'),
  frame_crystal_luxe: profileAssetUrl('clean-assets-replacement/crystal-luxe-transparent.webp'),
  frame_star_crown: profileAssetUrl('clean-assets-replacement/star-crown-transparent.webp'),
  offer_vip_combo: profileAssetUrl('clean-assets-replacement/star-crown-transparent.webp'),
  frame_diamond_comet: profileAssetUrl('clean-assets-replacement/galaxy-ring-transparent.webp'),
  frame_diamond_crown: profileAssetUrl('clean-assets-replacement/cyber-orbit-transparent.webp'),
  frame_diamond_halo: profileAssetUrl('clean-assets-replacement/galaxy-ring-transparent.webp'),
  frame_royal_gold: profileAssetUrl('clean-assets-replacement/royal-gold-transparent.webp'),
  frame_cyber_punk: profileAssetUrl('clean-assets-replacement/cyber-orbit-transparent.webp'),
  frame_nature_leaf: profileAssetUrl('clean-assets-replacement/nature-leaf-transparent.webp'),
  frame_galaxy: profileAssetUrl('clean-assets-replacement/galaxy-ring-transparent.webp'),
  frame_ramadan_gold: profileAssetUrl('clean-assets-replacement/ramadan-green-transparent.webp'),
  frame_ramadan_green: profileAssetUrl('clean-assets-replacement/ramadan-green-transparent.webp'),
  frame_ramadan_lantern: profileAssetUrl('clean-assets-replacement/ramadan-green-transparent.webp'),
  frame_school_stationary: profileAssetUrl('clean-assets-replacement/school-stationary-transparent.webp'),
  frame_school_bus: profileAssetUrl('clean-assets-replacement/school-bus-transparent.webp'),
  frame_matrix: profileAssetUrl('clean-assets-replacement/cyber-orbit-transparent.webp'),
  frame_back_to_school: profileAssetUrl('clean-assets-replacement/school-bus-transparent.webp'),
  frame_dragon_spirit: profileAssetUrl('clean-assets-replacement/fire-trail-transparent.webp'),
  frame_legendary_dragon: profileAssetUrl('clean-assets-replacement/fire-trail-transparent.webp'),
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
