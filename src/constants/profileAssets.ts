export type AvatarGender = 'boy' | 'girl';

export interface AvatarPreset {
  id: string;
  label: string;
  labelAr: string;
  gender: AvatarGender;
  url: string;
}

const LEGACY_PROFILE_ASSET_ALIASES: Record<string, string> = {
  'avatars/avatar-football-pro.webp': 'clean-assets-deterministic/avatar-football-pro-transparent.webp',
  'avatars/girl-studying-activity.webp': 'clean-assets-deterministic/girl-studying-activity-transparent.webp',
  'avatars/avatar-music-pro.webp': 'clean-assets-deterministic/avatar-music-pro-transparent.webp',
  'avatars/girl-school-walk.webp': 'clean-assets-deterministic/girl-school-walk-transparent.webp',
  'avatars/avatar-skater-pro.webp': 'clean-assets-deterministic/avatar-skater-pro-transparent.webp',
  'avatars/new_girl_avatar.webp': 'clean-assets-deterministic/new_girl_avatar-transparent.webp',
  'frame-diamond-comet_596fd1b8.webp': 'clean-assets-deterministic/frame-diamond-comet-quizspace-transparent.webp',
  'frame-diamond-crown_c3f3f17c.webp': 'clean-assets-deterministic/frame-diamond-crown-quizspace-transparent.webp',
  'frame-ramadan-crescent_1c3d1be8.webp': 'clean-assets-deterministic/frame-ramadan-lantern-quizspace-transparent.webp',
  'frame-back-school_68d31549.webp': 'clean-assets-deterministic/frame-back-to-school-quizspace-transparent.webp',
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
  if (localPath.startsWith('/manus-storage/')) return `${base}images/frame-free-2.webp`;
  return `${base}${normalized}`;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'boy-football', label: 'Football', labelAr: 'كرة القدم', gender: 'boy', url: profileAssetUrl('clean-assets-deterministic/avatar-football-pro-transparent.webp') },
  { id: 'girl-studying', label: 'Study mode', labelAr: 'وقت المذاكرة', gender: 'girl', url: profileAssetUrl('clean-assets-deterministic/girl-studying-activity-transparent.webp') },
  { id: 'boy-music', label: 'Music', labelAr: 'الموسيقى', gender: 'boy', url: profileAssetUrl('clean-assets-deterministic/avatar-music-pro-transparent.webp') },
  { id: 'girl-walking', label: 'School walk', labelAr: 'مشوار المدرسة', gender: 'girl', url: profileAssetUrl('clean-assets-deterministic/girl-school-walk-transparent.webp') },
  { id: 'boy-cap-glasses', label: 'Cap & glasses', labelAr: 'كاب ونظارات', gender: 'boy', url: profileAssetUrl('clean-assets-deterministic/avatar-skater-pro-transparent.webp') },
  { id: 'girl-explorer', label: 'Explorer', labelAr: 'مستكشفة الفضاء', gender: 'girl', url: profileAssetUrl('clean-assets-deterministic/new_girl_avatar-transparent.webp') },
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
    image_url: profileAssetUrl('images/frame-free-1.webp'),
    css_class: 'frame-free-soft-halo',
    is_free: true,
  },
  {
    id: 'frame_free_2',
    name: 'Clean Mint',
    name_ar: 'نعناع هادئ',
    image_url: profileAssetUrl('images/frame-free-2.webp'),
    css_class: 'frame-free-clean-mint',
    is_free: true,
  },
];

export const FRAME_ASSET_OVERRIDES: Record<string, string> = {
  frame_diamond_comet: profileAssetUrl('clean-assets-deterministic/frame-diamond-comet-quizspace-transparent.webp'),
  frame_diamond_crown: profileAssetUrl('clean-assets-deterministic/frame-diamond-crown-quizspace-transparent.webp'),
  frame_ramadan_lantern: profileAssetUrl('clean-assets-deterministic/frame-ramadan-lantern-quizspace-transparent.webp'),
  frame_back_to_school: profileAssetUrl('clean-assets-deterministic/frame-back-to-school-quizspace-transparent.webp'),
};

export function uniqueProfileFrames<T extends { id?: string | null; image_url?: string | null }>(frames: T[]): T[] {
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  return frames.filter((frame) => {
    const id = String(frame.id || '').trim();
    const image = String(frame.image_url || '').trim();
    if (!id || seenIds.has(id) || (image && seenImages.has(image))) return false;
    seenIds.add(id);
    if (image) seenImages.add(image);
    return true;
  });
}

export function resolveFrameAsset(frame: { id?: string | null; image_url?: string | null }): string {
  const override = frame.id ? FRAME_ASSET_OVERRIDES[frame.id] : undefined;
  return override || profileAssetUrl(String(frame.image_url || ''));
}
