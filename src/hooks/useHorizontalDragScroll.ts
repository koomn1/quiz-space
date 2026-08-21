import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

export function useHorizontalDragScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ pointerId: -1, lastX: 0, didDrag: false });

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    const usesFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    if (!rail || !usesFinePointer || rail.scrollWidth <= rail.clientWidth) return;

    const delta = event.deltaX || event.deltaY;
    if (!delta) return;
    event.preventDefault();
    rail.scrollBy({ left: delta, behavior: 'auto' });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    dragRef.current = { pointerId: event.pointerId, lastX: event.clientX, didDrag: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    const drag = dragRef.current;
    if (!rail || drag.pointerId !== event.pointerId) return;

    const delta = drag.lastX - event.clientX;
    if (Math.abs(delta) > 1) {
      drag.didDrag = true;
      rail.scrollBy({ left: delta, behavior: 'auto' });
      drag.lastX = event.clientX;
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.pointerId = -1;
    window.setTimeout(() => { drag.didDrag = false; }, 0);
  };

  return {
    scrollRef,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    shouldSuppressClick: () => dragRef.current.didDrag,
  };
}
