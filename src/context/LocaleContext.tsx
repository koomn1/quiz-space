import React from 'react';

export type AppLanguage = 'ar' | 'en';

interface LocaleContextValue {
  lang: AppLanguage;
  setLang: React.Dispatch<React.SetStateAction<AppLanguage>>;
}

const LocaleContext = React.createContext<LocaleContextValue | undefined>(undefined);

function readLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'ar';
  const saved = window.localStorage.getItem('quiz_language');
  return saved === 'en' ? 'en' : 'ar';
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<AppLanguage>(readLanguage);

  React.useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    window.localStorage.setItem('quiz_language', lang);
  }, [lang]);

  const value = React.useMemo(() => ({ lang, setLang }), [lang]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = React.useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
}
