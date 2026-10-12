import React from 'react';
import { getThemePreset } from '../lib/themePresets';

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  colorTheme: string;
  setColorTheme: React.Dispatch<React.SetStateAction<string>>;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function readDarkMode() {
  if (typeof window === 'undefined') return true;
  const savedTheme = window.localStorage.getItem('quiz_theme');
  if (!savedTheme) {
    window.localStorage.setItem('quiz_theme', 'dark');
    return true;
  }
  return savedTheme !== 'light';
}

function readColorTheme() {
  if (typeof window === 'undefined') return getThemePreset(null).id;
  return getThemePreset(window.localStorage.getItem('quiz_color_theme')).id;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = React.useState(readDarkMode);
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

    root.classList.toggle('dark', darkMode);
    root.dataset.colorTheme = selected.id;
    root.style.setProperty('--theme-gradient-from', selected.gradientFrom);
    root.style.setProperty('--theme-gradient-to', selected.gradientTo);
    root.style.setProperty('--theme-primary', selected.primary);
    root.style.setProperty('--theme-primary-hover', selected.primaryHover);
    root.style.setProperty('--theme-primary-light', selected.primaryLight);
    root.style.setProperty('--theme-primary-dark', selected.primaryDark);
    root.style.colorScheme = darkMode ? 'dark' : 'light';

    window.localStorage.setItem('quiz_theme', darkMode ? 'dark' : 'light');
    window.localStorage.setItem('quiz_color_theme', selected.id);
  }, [colorTheme, darkMode]);

  const value = React.useMemo(() => ({ darkMode, setDarkMode, colorTheme, setColorTheme }), [darkMode, colorTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
