export type ThemePreset = {
  id: 'indigo' | 'light' | 'sky' | 'emerald' | 'sunset' | 'pastelp' | 'honey';
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  gradientFrom: string;
  gradientTo: string;
  swatch: string;
};

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'indigo', primary: '#9333ea', primaryHover: '#7e22ce', primaryLight: '#faf5ff', primaryDark: '#1e0b36', gradientFrom: '#8b5cf6', gradientTo: '#ec4899', swatch: 'from-violet-500 via-purple-600 to-pink-500' },
  { id: 'light', primary: '#4f46e5', primaryHover: '#4338ca', primaryLight: '#f0f2ff', primaryDark: '#1e1b4b', gradientFrom: '#6366f1', gradientTo: '#3b82f6', swatch: 'from-blue-500 via-indigo-600 to-violet-600' },
  { id: 'sky', primary: '#0284c7', primaryHover: '#0369a1', primaryLight: '#f0f9ff', primaryDark: '#0c4a6e', gradientFrom: '#0284c7', gradientTo: '#06b6d4', swatch: 'from-sky-400 via-cyan-500 to-blue-600' },
  { id: 'emerald', primary: '#10b981', primaryHover: '#059669', primaryLight: '#ecfdf5', primaryDark: '#064e3b', gradientFrom: '#10b981', gradientTo: '#059669', swatch: 'from-emerald-400 via-teal-500 to-green-600' },
  { id: 'sunset', primary: '#ea580c', primaryHover: '#c2410c', primaryLight: '#fff7ed', primaryDark: '#431407', gradientFrom: '#f97316', gradientTo: '#be123c', swatch: 'from-orange-400 via-amber-500 to-rose-600' },
  { id: 'pastelp', primary: '#db2777', primaryHover: '#be185d', primaryLight: '#fdf2f8', primaryDark: '#500724', gradientFrom: '#f472b6', gradientTo: '#fda4af', swatch: 'from-pink-300 via-rose-300 to-pink-400' },
  { id: 'honey', primary: '#d97706', primaryHover: '#b45309', primaryLight: '#fffbeb', primaryDark: '#451a03', gradientFrom: '#f59e0b', gradientTo: '#f97316', swatch: 'from-amber-400 via-orange-500 to-yellow-500' },
];

export function getThemePreset(id: string | null | undefined): ThemePreset {
  return THEME_PRESETS.find((theme) => theme.id === id) || THEME_PRESETS[0];
}
