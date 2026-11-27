import { useEffect } from 'react';
import { getUserProfileStats } from '../lib/db';

/** True for Ctrl/Cmd+K pressed outside a text field. */
export function isCommandShortcut(event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'key'>, isTyping: boolean): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !isTyping;
}

export function useCommandPaletteShortcut(onOpen: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || !!target?.isContentEditable;
      if (isCommandShortcut(event, isTyping)) {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
}

/** Refreshes the user's stats when a quiz finishes and broadcasts `quizspace:xp-updated`. */
export function useXpRefresh(
  userId: string,
  onStats: (stats: any) => void,
  onCompletions: (completions: any) => void,
): void {
  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!userId || (detail?.userId && detail.userId !== userId)) return;
      getUserProfileStats(userId).then(stats => {
        onStats(stats);
        if (stats.completions) onCompletions(stats.completions);
      }).catch(e => console.warn('Error refreshing XP after quiz:', e));
    };
    window.addEventListener('quizspace:xp-updated', refresh);
    return () => window.removeEventListener('quizspace:xp-updated', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
