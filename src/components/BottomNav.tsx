import React from 'react';
import { Compass, FileQuestion, House, MessageCircle, UserRound } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
  lang: 'ar' | 'en';
  isGuest?: boolean;
  hidden?: boolean;
}

const items = [
  { id: 'landing', ar: 'الرئيسية', en: 'Home', icon: House },
  { id: 'explore', ar: 'استكشاف', en: 'Explore', icon: Compass },
  { id: 'my-quizzes', ar: 'اختباراتي', en: 'Quizzes', icon: FileQuestion },
  { id: 'community', ar: 'المجتمع', en: 'Community', icon: MessageCircle },
  { id: 'profile', ar: 'الملف', en: 'Profile', icon: UserRound },
] as const;

export default function BottomNav({ currentTab, setTab, lang, isGuest = false, hidden = false }: BottomNavProps) {
  if (hidden) return null;
  const visibleItems = isGuest ? items.filter(item => item.id !== 'my-quizzes' && item.id !== 'profile') : items;

  return (
    <nav className="liquid-bottom-nav" aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="liquid-bottom-nav__inner">
        {visibleItems.map(({ id, ar, en, icon: Icon }) => {
          const active = id === 'landing' ? currentTab === 'landing' : currentTab === id;
          return (
            <button
              key={id}
              type="button"
              className={`liquid-bottom-nav__item ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              <span className="liquid-bottom-nav__icon"><Icon aria-hidden="true" /></span>
              <span>{lang === 'ar' ? ar : en}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
