import type { CSSProperties, ReactNode } from 'react'
import { cn } from './cn'

export type IconSize = 'sm' | 'md' | 'lg' | number

export interface IconProps {
  /** Glyph content — an inline SVG, a symbol character, or an emoji. */
  children: ReactNode
  /**
   * Accessible label. When provided the icon is exposed as `role="img"`;
   * when omitted the icon is decorative (`aria-hidden`).
   */
  label?: string
  /** `sm` 16px · `md` 20px · `lg` 24px · or a number (px). Default `md`. */
  size?: IconSize
  className?: string
  style?: CSSProperties
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg', string> = {
  sm: '16px',
  md: '20px',
  lg: '24px',
}

/**
 * SF Symbols analog. A square, inline-centered glyph container.
 *
 * Web cannot ship SF Symbols (Apple-platform license), so callers pass their own
 * glyph (SVG/character). A first-class symbol set is tracked in the DS backlog (P2).
 */
export function Icon({ children, label, size = 'md', className, style }: IconProps) {
  const dimension = typeof size === 'number' ? `${size}px` : SIZE_MAP[size]
  return (
    <span
      className={cn('ios27-icon', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
        width: dimension,
        height: dimension,
        ...style,
      }}
    >
      {children}
    </span>
  )
}
