export type ThemePreset = {
  id: 'indigo' | 'light' | 'sky' | 'blue' | 'deep-night' | 'emerald' | 'sunset' | 'pastelp' | 'honey';
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  gradientFrom: string;
  gradientTo: string;
  canvas: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
  muted: string;
  glow: string;
  swatch: string;
};

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'indigo', primary: '#8B5CF6', primaryHover: '#7C3AED', primaryLight: '#F5F3FF', primaryDark: '#211438',
    secondary: '#22D3EE', gradientFrom: '#7C3AED', gradientTo: '#EC4899', canvas: '#0D0A1A', surface: '#17112B', surfaceStrong: '#24183D',
    border: 'rgba(167,139,250,.24)', text: '#F7F3FF', muted: '#B9AED1', glow: 'rgba(139,92,246,.22)', swatch: 'from-violet-500 via-fuchsia-500 to-cyan-400',
  },
  {
    id: 'light', primary: '#4F46E5', primaryHover: '#4338CA', primaryLight: '#EEF2FF', primaryDark: '#1E1B4B',
    secondary: '#0891B2', gradientFrom: '#4F46E5', gradientTo: '#06B6D4', canvas: '#F5F7FB', surface: '#FFFFFF', surfaceStrong: '#EEF2FF',
    border: 'rgba(99,102,241,.18)', text: '#172554', muted: '#64748B', glow: 'rgba(79,70,229,.14)', swatch: 'from-indigo-500 via-blue-500 to-cyan-400',
  },
  {
    id: 'sky', primary: '#0284C7', primaryHover: '#0369A1', primaryLight: '#E0F2FE', primaryDark: '#082F49',
    secondary: '#14B8A6', gradientFrom: '#0284C7', gradientTo: '#14B8A6', canvas: '#F2FAFC', surface: '#FFFFFF', surfaceStrong: '#E6F7F6',
    border: 'rgba(14,165,233,.2)', text: '#0C334A', muted: '#5B7180', glow: 'rgba(20,184,166,.14)', swatch: 'from-sky-500 via-cyan-500 to-teal-400',
  },
  {
    id: 'blue', primary: '#2563EB', primaryHover: '#1D4ED8', primaryLight: '#EFF6FF', primaryDark: '#172554',
    secondary: '#F59E0B', gradientFrom: '#2563EB', gradientTo: '#06B6D4', canvas: '#F4F8FF', surface: '#FFFFFF', surfaceStrong: '#EAF2FF',
    border: 'rgba(37,99,235,.18)', text: '#172554', muted: '#64748B', glow: 'rgba(37,99,235,.14)', swatch: 'from-blue-600 via-cyan-500 to-amber-400',
  },
  {
    id: 'deep-night', primary: '#A78BFA', primaryHover: '#8B5CF6', primaryLight: '#1B1535', primaryDark: '#05040C',
    secondary: '#38BDF8', gradientFrom: '#4C1D95', gradientTo: '#0E7490', canvas: '#060711', surface: '#0E1020', surfaceStrong: '#171A32',
    border: 'rgba(129,140,248,.25)', text: '#F5F3FF', muted: '#A5B4D4', glow: 'rgba(56,189,248,.18)', swatch: 'from-slate-950 via-indigo-900 to-cyan-700',
  },
  {
    id: 'emerald', primary: '#059669', primaryHover: '#047857', primaryLight: '#ECFDF5', primaryDark: '#064E3B',
    secondary: '#0F766E', gradientFrom: '#059669', gradientTo: '#0F766E', canvas: '#F3FAF7', surface: '#FFFFFF', surfaceStrong: '#E5F5EE',
    border: 'rgba(16,185,129,.2)', text: '#12352D', muted: '#61766E', glow: 'rgba(15,118,110,.15)', swatch: 'from-emerald-500 via-teal-600 to-slate-700',
  },
  {
    id: 'sunset', primary: '#E76F51', primaryHover: '#C9563D', primaryLight: '#FFF1EC', primaryDark: '#4A1D16',
    secondary: '#264653', gradientFrom: '#E76F51', gradientTo: '#E9C46A', canvas: '#FFF9F5', surface: '#FFFFFF', surfaceStrong: '#FFF0E8',
    border: 'rgba(231,111,81,.2)', text: '#3C2520', muted: '#806C66', glow: 'rgba(233,196,106,.18)', swatch: 'from-rose-500 via-orange-400 to-amber-300',
  },
  {
    id: 'pastelp', primary: '#DB2777', primaryHover: '#BE185D', primaryLight: '#FDF2F8', primaryDark: '#500724',
    secondary: '#7C3AED', gradientFrom: '#DB2777', gradientTo: '#8B5CF6', canvas: '#FFF7FB', surface: '#FFFFFF', surfaceStrong: '#FCEAF4',
    border: 'rgba(219,39,119,.18)', text: '#4A1230', muted: '#806477', glow: 'rgba(124,58,237,.14)', swatch: 'from-pink-500 via-rose-400 to-violet-500',
  },
  {
    id: 'honey', primary: '#D97706', primaryHover: '#B45309', primaryLight: '#FFFBEB', primaryDark: '#451A03',
    secondary: '#0F766E', gradientFrom: '#D97706', gradientTo: '#0F766E', canvas: '#FFFCF5', surface: '#FFFFFF', surfaceStrong: '#FFF5D8',
    border: 'rgba(217,119,6,.2)', text: '#422006', muted: '#796B58', glow: 'rgba(15,118,110,.14)', swatch: 'from-amber-500 via-orange-400 to-teal-600',
  },
];

export function getThemePreset(id: string | null | undefined): ThemePreset {
  return THEME_PRESETS.find((theme) => theme.id === id) || THEME_PRESETS[0];
}
