import { useEffect } from 'react';

type PollCallback = () => void | Promise<void>;

/** Runs a callback on a timeout loop only while the document is visible. */
export function useVisibilityPolling(callback: PollCallback, intervalMs: number): void {
  useEffect(() => {
    let timer: number | undefined;
    let active = true;

    const run = async () => {
      if (!active) return;
      if (!document.hidden) {
        try {
          await callback();
        } catch (error) {
          console.warn('[QuizSpace] visibility polling failed', error);
        }
      }
      if (active) timer = window.setTimeout(run, intervalMs);
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        void Promise.resolve(callback()).catch((error) => {
          console.warn('[QuizSpace] visibility refresh failed', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    void run();

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [callback, intervalMs]);
}
