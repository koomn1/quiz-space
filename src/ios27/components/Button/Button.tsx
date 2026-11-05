import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib'

export type ButtonVariant = 'filled' | 'gray' | 'tinted' | 'plain' | 'liquid-glass'
export type ButtonSize = 'small' | 'medium' | 'large'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * iOS 27 button appearance.
   * - `filled` — content-area filled (blue / white)
   * - `gray` — content-area gray fill, blue label
   * - `tinted` — translucent blue tint
   * - `plain` — text only
   * - `liquid-glass` — Liquid Glass surface
   * @default 'filled'
   */
  variant?: ButtonVariant
  /** @default 'medium' */
  size?: ButtonSize
  children: ReactNode
}

/**
 * iOS 27 Button. A native `<button>` with iOS appearance variants and sizes.
 * Accessibility: real button semantics, visible `:focus-visible` ring,
 * `disabled` handling, and reduced-motion–aware press feedback.
 *
 * @example
 * <Button variant="filled" size="large" onClick={save}>Save</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'filled', size = 'medium', type = 'button', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('ios27-btn', `ios27-btn--${variant}`, `ios27-btn--${size}`, className)}
      {...rest}
    >
      {children}
    </button>
  )
})
