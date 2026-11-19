import React from 'react';
import { getThemePreset } from '../lib/themePresets';

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  themePreference: 'light' | 'dark' | 'system';
  setThemePreference: (preference: 'light' | 'dark' | 'system') => void;
  colorTheme: string;
  setColorTheme: (theme: string | ((prev: string) => string)) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function prefersDark(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

function readThemePreference(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem('quiz_theme_preference');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    const legacy = window.localStorage.getItem('quiz_theme');
    if (legacy === 'light' || legacy === 'dark') return legacy;
  } catch (_) {}
  return 'dark';
}

function resolveDarkMode(preference: 'light' | 'dark' | 'system'): boolean {
  if (preference === 'system') return prefersDark();
  return preference === 'dark';
}

function readColorTheme(): string {
  if (typeof window === 'undefined') return getThemePreset(null).id;
  try {
    return getThemePreset(window.localStorage.getItem('quiz_color_theme')).id;
  } catch (_) {
    return getThemePreset(null).id;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = React.useState<'light' | 'dark' | 'system'>(readThemePreference);
  const [darkMode, setDarkModeState] = React.useState<boolean>(() => resolveDarkMode(readThemePreference()));
  const [colorTheme, setColorThemeState] = React.useState<string>(readColorTheme);

  // setDarkMode updates both darkMode and themePreference to keep them synchronized
  const setDarkMode = React.useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setDarkModeState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const nextPreference: 'light' | 'dark' = next ? 'dark' : 'light';
      setThemePreferenceState(nextPreference);
      try {
        window.localStorage.setItem('quiz_theme', next ? 'dark' : 'light');
        window.localStorage.setItem('quiz_theme_preference', nextPreference);
      } catch (_) {}
      return next;
    });
  }, []);

  const setThemePreference = React.useCallback((preference: 'light' | 'dark' | 'system') => {
    setThemePreferenceState(preference);
    const resolvedDark = resolveDarkMode(preference);
    setDarkModeState(resolvedDark);
    try {
      window.localStorage.setItem('quiz_theme', resolvedDark ? 'dark' : 'light');
      window.localStorage.setItem('quiz_theme_preference', preference);
    } catch (_) {}
  }, []);

  const setColorTheme = React.useCallback((action: string | ((prev: string) => string)) => {
    setColorThemeState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const validated = getThemePreset(next).id;
      try {
        window.localStorage.setItem('quiz_color_theme', validated);
      } catch (_) {}
      return validated;
    });
  }, []);

  // Synchronize on system color scheme changes if system preference is selected
  React.useEffect(() => {
    if (themePreference !== 'system' || typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setDarkModeState(media.matches);
      try {
        window.localStorage.setItem('quiz_theme', media.matches ? 'dark' : 'light');
      } catch (_) {}
    };
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, [themePreference]);

  // Sync across tabs / custom events
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'quiz_theme_preference' || e.key === 'quiz_theme') {
        const nextPref = readThemePreference();
        setThemePreferenceState(nextPref);
        setDarkModeState(resolveDarkMode(nextPref));
      } else if (e.key === 'quiz_color_theme') {
        setColorThemeState(readColorTheme());
      }
    };
    const handleCustomThemeUpdate = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setColorThemeState(getThemePreset(custom.detail).id);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('quizspace-theme-updated', handleCustomThemeUpdate);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('quizspace-theme-updated', handleCustomThemeUpdate);
    };
  }, []);

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const selected = getThemePreset(colorTheme);

    if (selected.id !== colorTheme) {
      setColorThemeState(selected.id);
      return;
    }

    // Theme changes update many utility classes at once. Temporarily disable
    // per-element transitions so the browser does not animate/repaint the
    // entire page for several seconds or flash a white intermediate frame.
    root.classList.add('theme-switching');
    root.classList.toggle('dark', darkMode);
    root.dataset.theme = darkMode ? 'dark' : 'light';
    root.dataset.colorTheme = selected.id;

    const modeTokens = darkMode ? selected.dark : selected.light;
    root.style.setProperty('--theme-gradient-from', selected.gradientFrom);
    root.style.setProperty('--theme-gradient-to', selected.gradientTo);
    root.style.setProperty('--theme-primary', selected.primary);
    root.style.setProperty('--theme-primary-hover', selected.primaryHover);
    root.style.setProperty('--theme-primary-light', selected.primaryLight);
    root.style.setProperty('--theme-primary-dark', selected.primaryDark);
    root.style.setProperty('--theme-secondary', selected.secondary);
    root.style.setProperty('--theme-coral', '#EE8361');
    root.style.setProperty('--theme-sand', '#FBDFC7');
    root.style.setProperty('--theme-ivory', '#FCF6EE');
    root.style.setProperty('--theme-petrol', '#007472');
    root.style.setProperty('--theme-bright-teal', '#2AC3BB');
    root.style.setProperty('--theme-canvas', modeTokens.canvas);
    root.style.setProperty('--theme-surface', modeTokens.surface);
    root.style.setProperty('--theme-surface-strong', modeTokens.surfaceStrong);
    root.style.setProperty('--theme-border', modeTokens.border);
    root.style.setProperty('--theme-text', modeTokens.text);
    root.style.setProperty('--theme-muted', modeTokens.muted);
    root.style.setProperty('--theme-glow', modeTokens.glow);
    root.style.setProperty('--app-page-bg', modeTokens.canvas);
    root.style.setProperty('--app-surface', modeTokens.surface);
    root.style.setProperty('--app-surface-strong', modeTokens.surfaceStrong);
    root.style.setProperty('--app-border', modeTokens.border);
    root.style.setProperty('--app-text', modeTokens.text);
    root.style.setProperty('--app-text-muted', modeTokens.muted);
    root.style.colorScheme = darkMode ? 'dark' : 'light';
    root.style.backgroundColor = modeTokens.canvas;
    root.style.color = modeTokens.text;
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.backgroundColor = modeTokens.canvas;
      document.body.style.color = modeTokens.text;
    }

    try {
      window.localStorage.setItem('quiz_theme', darkMode ? 'dark' : 'light');
      window.localStorage.setItem('quiz_theme_preference', themePreference);
      window.localStorage.setItem('quiz_color_theme', selected.id);
    } catch (_) {}

    const releaseTimer = window.setTimeout(() => root.classList.remove('theme-switching'), 80);
    return () => window.clearTimeout(releaseTimer);
  }, [colorTheme, darkMode, themePreference]);

  const value = React.useMemo(
    () => ({ darkMode, setDarkMode, themePreference, setThemePreference, colorTheme, setColorTheme }),
    [darkMode, setDarkMode, themePreference, setThemePreference, colorTheme, setColorTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
