import { useEffect, useState } from 'react';

/**
 * Returns true while `open` is true, and stays true for `delayMs` after it turns false
 * so an exit animation can finish before the element unmounts.
 */
export function useDelayedUnmount(open: boolean, delayMs: number): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [open, delayMs]);
  return mounted;
}
