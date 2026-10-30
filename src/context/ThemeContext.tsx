import React from 'react';
import { getThemePreset } from '../lib/themePresets';

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  themePreference: 'light' | 'dark' | 'system';
  setThemePreference: (preference: 'light' | 'dark' | 'system') => void;
  colorTheme: string;
  setColorTheme: React.Dispatch<React.SetStateAction<string>>;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function readThemePreference(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem('quiz_theme_preference');
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  return window.localStorage.getItem('quiz_theme') === 'light' ? 'light' : 'dark';
}
function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function readColorTheme() {
  if (typeof window === 'undefined') return getThemePreset(null).id;
  return getThemePreset(window.localStorage.getItem('quiz_color_theme')).id;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = React.useState(readThemePreference);
  const [darkMode, setDarkMode] = React.useState(() => {
    const preference = readThemePreference();
    return preference === 'system' ? prefersDark() : preference === 'dark';
  });
  const [colorTheme, setColorTheme] = React.useState(readColorTheme);

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const selected = getThemePreset(colorTheme);

    if (selected.id !== colorTheme) {
      setColorTheme(selected.id);
      return;
    }

    if (selected.id === 'deep-night' && !darkMode) {
      setDarkMode(true);
    }

    // Theme changes update many utility classes at once. Temporarily disable
    // per-element transitions so the browser does not animate/repaint the
    // entire page for several seconds or flash a white intermediate frame.
    root.classList.add('theme-switching');
    root.classList.toggle('dark', darkMode);
    root.dataset.colorTheme = selected.id;

    const modeTokens = darkMode ? selected.dark : selected.light;
    root.style.setProperty('--theme-gradient-from', selected.gradientFrom);
    root.style.setProperty('--theme-gradient-to', selected.gradientTo);
    root.style.setProperty('--theme-primary', selected.primary);
    root.style.setProperty('--theme-primary-hover', selected.primaryHover);
    root.style.setProperty('--theme-primary-light', selected.primaryLight);
    root.style.setProperty('--theme-primary-dark', selected.primaryDark);
    root.style.setProperty('--theme-secondary', selected.secondary);
    root.style.setProperty('--theme-canvas', modeTokens.canvas);
    root.style.setProperty('--theme-surface', modeTokens.surface);
    root.style.setProperty('--theme-surface-strong', modeTokens.surfaceStrong);
    root.style.setProperty('--theme-border', modeTokens.border);
    root.style.setProperty('--theme-text', modeTokens.text);
    root.style.setProperty('--theme-muted', modeTokens.muted);
    root.style.setProperty('--theme-glow', modeTokens.glow);
    root.style.colorScheme = darkMode ? 'dark' : 'light';

    window.localStorage.setItem('quiz_theme', darkMode ? 'dark' : 'light');
    window.localStorage.setItem('quiz_theme_preference', themePreference);
    window.localStorage.setItem('quiz_color_theme', selected.id);
    const releaseTimer = window.setTimeout(() => root.classList.remove('theme-switching'), 80);
    return () => window.clearTimeout(releaseTimer);
  }, [colorTheme, darkMode, themePreference]);

  const setThemePreference = React.useCallback((preference: 'light' | 'dark' | 'system') => {
    setThemePreferenceState(preference);
    setDarkMode(preference === 'system' ? prefersDark() : preference === 'dark');
  }, []);

  React.useEffect(() => {
    if (themePreference !== 'system' || typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setDarkMode(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, [themePreference]);

  const value = React.useMemo(() => ({ darkMode, setDarkMode, themePreference, setThemePreference, colorTheme, setColorTheme }), [darkMode, themePreference, setThemePreference, colorTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
