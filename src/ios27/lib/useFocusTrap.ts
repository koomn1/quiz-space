import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface UseFocusTrapOptions {
  /** Invoked when Escape is pressed while the trap is active. */
  onEscape?: () => void
  /** Restore focus to the previously focused element on deactivate. Default `true`. */
  restoreFocus?: boolean
}

/**
 * Traps keyboard focus within a container while `active`.
 *
 * - Moves focus to the first focusable element (or the container) on activation.
 * - Cycles Tab / Shift+Tab within the container.
 * - Calls `onEscape` on the Escape key.
 * - Restores focus to the previously focused element on deactivation.
 *
 * Attach the returned ref to the dialog/sheet/menu element.
 * Required by overlay components (Alert, Sheet, ContextMenu — group G4).
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  active: boolean,
  options: UseFocusTrapOptions = {},
): RefObject<T> {
  const ref = useRef<T>(null)
  const { onEscape, restoreFocus = true } = options

  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const getFocusable = (): HTMLElement[] =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )

    // Initial focus.
    const first = getFocusable()[0] ?? node
    first.focus({ preventScroll: true })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscapeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const items = getFocusable()
      if (items.length === 0) {
        event.preventDefault()
        node.focus({ preventScroll: true })
        return
      }

      const firstEl = items[0]!
      const lastEl = items[items.length - 1]!
      const activeEl = document.activeElement

      if (event.shiftKey) {
        if (activeEl === firstEl || !node.contains(activeEl)) {
          event.preventDefault()
          lastEl.focus({ preventScroll: true })
        }
      } else if (activeEl === lastEl || !node.contains(activeEl)) {
        event.preventDefault()
        firstEl.focus({ preventScroll: true })
      }
    }

    // Document-level so the trap holds even if focus escapes the container.
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [active, restoreFocus])

  return ref
}
