export type AvatarGender = 'boy' | 'girl';

export interface AvatarPreset {
  id: string;
  label: string;
  labelAr: string;
  gender: AvatarGender;
  url: string;
}

export function profileAssetUrl(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/manus-storage/')) return path;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return `${base}${path.replace(/^\//, '')}`;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'boy-football', label: 'Football', labelAr: 'كرة القدم', gender: 'boy', url: profileAssetUrl('avatars/avatar-football-pro.webp') },
  { id: 'girl-studying', label: 'Study mode', labelAr: 'وقت المذاكرة', gender: 'girl', url: profileAssetUrl('avatars/girl-studying-activity.webp') },
  { id: 'boy-music', label: 'Music', labelAr: 'الموسيقى', gender: 'boy', url: profileAssetUrl('avatars/avatar-music-pro.webp') },
  { id: 'girl-walking', label: 'School walk', labelAr: 'مشوار المدرسة', gender: 'girl', url: profileAssetUrl('avatars/girl-school-walk.webp') },
  { id: 'boy-cap-glasses', label: 'Cap & glasses', labelAr: 'كاب ونظارات', gender: 'boy', url: profileAssetUrl('avatars/avatar-skater-pro.webp') },
  { id: 'girl-explorer', label: 'Explorer', labelAr: 'مستكشفة الفضاء', gender: 'girl', url: profileAssetUrl('avatars/new_girl_avatar.webp') },
];

export const AVATAR_PRESET_URLS = AVATAR_PRESETS.map((avatar) => avatar.url);

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
  frame_diamond_comet: profileAssetUrl('images/frame-diamond-comet-quizspace.webp'),
  frame_diamond_crown: profileAssetUrl('images/frame-diamond-crown-quizspace.webp'),
  frame_ramadan_lantern: profileAssetUrl('images/frame-ramadan-lantern-quizspace.webp'),
  frame_back_to_school: profileAssetUrl('images/frame-back-to-school-quizspace.webp'),
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
