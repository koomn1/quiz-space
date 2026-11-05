import { useCallback, useRef, useState } from 'react'

export interface UseControllableStateParams<T> {
  /** Controlled value. When provided, the hook is in controlled mode. */
  value?: T
  /** Initial value for uncontrolled mode. */
  defaultValue?: T
  /** Notified on every change in BOTH controlled and uncontrolled modes. */
  onChange?: (value: T) => void
}

/**
 * Radix-style controllable state. Lets a component support both controlled
 * (`value` + `onChange`) and uncontrolled (`defaultValue`) usage from one prop set.
 *
 * Pass the next value directly to the setter (functional updaters are not supported,
 * keeping the controlled-mode contract unambiguous).
 *
 * @returns `[value, setValue]`
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateParams<T>): [T, (next: T) => void] {
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState<T | undefined>(defaultValue)

  // Keep onChange fresh without re-creating the setter identity.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const current = (isControlled ? value : uncontrolled) as T

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next)
      onChangeRef.current?.(next)
    },
    [isControlled],
  )

  return [current, setValue]
}
