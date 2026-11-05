import { clsx, type ClassValue } from 'clsx'

export type { ClassValue }

/**
 * Conditional className joiner. Thin wrapper over `clsx`.
 *
 * @example cn('ios27-btn', `ios27-btn--${variant}`, disabled && 'is-disabled', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
