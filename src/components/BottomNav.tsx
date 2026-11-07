import React from 'react';
import { SugaryIcon, SugaryIconName } from './SugaryIcon';

interface BottomNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
  lang: 'ar' | 'en';
  isGuest?: boolean;
  hidden?: boolean;
}

const items = [
  { id: 'landing', ar: 'الرئيسية', en: 'Home', icon: 'home' },
  { id: 'explore', ar: 'استكشاف', en: 'Explore', icon: 'globe' },
  { id: 'my-quizzes', ar: 'اختباراتي', en: 'Quizzes', icon: 'book' },
  { id: 'community', ar: 'المجتمع', en: 'Community', icon: 'layers' },
  { id: 'profile', ar: 'الملف', en: 'Profile', icon: 'crown' },
] as const;

export default function BottomNav({ currentTab, setTab, lang, isGuest = false, hidden = false }: BottomNavProps) {
  if (hidden) return null;
  const visibleItems = isGuest ? items.filter(item => item.id !== 'my-quizzes' && item.id !== 'profile') : items;

  return (
    <nav className="liquid-bottom-nav" aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="liquid-bottom-nav__inner" style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}>
        {visibleItems.map(({ id, ar, en, icon }) => {
          const active = id === 'landing' ? currentTab === 'landing' : currentTab === id;
          return (
            <button
              key={id}
              type="button"
              className={`liquid-bottom-nav__item ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              <span className="liquid-bottom-nav__icon"><SugaryIcon name={icon as SugaryIconName} size={30} alt="" /></span>
              <span>{lang === 'ar' ? ar : en}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
