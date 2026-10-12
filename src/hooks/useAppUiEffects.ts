import { useEffect } from 'react';

export function useAppUiEffects({
  isSidebarOpen,
  isAuthModalOpen,
  authRedirectQuizId,
  isCosmoTab,
  setIsSidebarOpen,
  sidebarWasOpenRef,
  sidebarMenuButtonRef,
  sidebarPanelRef,
  activeTab,
  activeQuizId,
  userId,
  userPhoto,
  userCustomId,
  isStatsLoaded,
}: {
  isSidebarOpen: boolean;
  isAuthModalOpen: boolean;
  authRedirectQuizId: string | null;
  isCosmoTab: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  sidebarWasOpenRef: React.MutableRefObject<boolean>;
  sidebarMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  sidebarPanelRef: React.RefObject<HTMLElement | null>;
  activeTab: string;
  activeQuizId: string | null;
  userId: string;
  userPhoto: string | null;
  userCustomId: string | null;
  isStatsLoaded: boolean;
}) {
  useEffect(() => {
    if (isSidebarOpen || isAuthModalOpen || authRedirectQuizId || isCosmoTab) {
      document.body.classList.add('scroll-lock');
      return () => document.body.classList.remove('scroll-lock');
    }
  }, [isSidebarOpen, isAuthModalOpen, authRedirectQuizId, isCosmoTab]);

  useEffect(() => {
    if (!isSidebarOpen) {
      if (sidebarWasOpenRef.current) {
        sidebarMenuButtonRef.current?.focus({ preventScroll: true });
        sidebarWasOpenRef.current = false;
      }
      return;
    }
    sidebarWasOpenRef.current = true;
    sidebarPanelRef.current?.focus({ preventScroll: true });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSidebarOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, activeQuizId]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const cards = document.querySelectorAll('.glass-panel, .glass-card, .card-3d');
      for (const card of cards) {
        const element = card as HTMLElement;
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
        element.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (userId && !userId.startsWith('user-') && isStatsLoaded) {
      try {
        const cacheKey = `user_profile_fallback_${userId}`;
        const existing = localStorage.getItem(cacheKey);
        const existingData = existing ? JSON.parse(existing) : {};
        localStorage.setItem(cacheKey, JSON.stringify({ ...existingData, uid: userId, photoURL: userPhoto, customId: userCustomId }));
      } catch (_) {}
    }
  }, [userId, userPhoto, userCustomId, isStatsLoaded]);
}
