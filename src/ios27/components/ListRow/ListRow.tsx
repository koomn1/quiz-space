import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib'

export interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * Show the trailing chevron (`›`) disclosure indicator, signalling the row
   * navigates somewhere.
   * @default false
   */
  disclosure?: boolean
  /**
   * Render the hairline bottom separator. Set `false` for the last row in a
   * section.
   * @default true
   */
  separator?: boolean
  /** Leading content — typically an icon or avatar. */
  leading?: ReactNode
  /** Trailing content — typically a secondary value (rendered `.text-secondary`). */
  trailing?: ReactNode
  /** Primary row content. */
  children: ReactNode
  /**
   * Tap handler. When provided the row becomes an interactive `role="button"`:
   * focusable, with Enter/Space activation.
   */
  onClick?: () => void
}

/**
 * iOS 27 ListRow. A single grouped-list row with optional leading / trailing
 * slots, a disclosure chevron and a hairline separator.
 *
 * Accessibility: when `onClick` is supplied the row exposes `role="button"`,
 * `tabIndex={0}`, a visible `:focus-visible` ring and Enter/Space activation.
 * Without `onClick` it is a plain, non-interactive container.
 *
 * @example
 * <ListRow leading={<Icon>★</Icon>} trailing="On" disclosure onClick={open}>
 *   Notifications
 * </ListRow>
 */
export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(function ListRow(
  { disclosure = false, separator = true, leading, trailing, children, onClick, className, onKeyDown, ...rest },
  ref,
) {
  const interactive = Boolean(onClick)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (!onClick || event.defaultPrevented) return
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      ref={ref}
      className={cn('ios27-list-row', separator && 'has-separator', interactive && 'ios27-list-row--interactive', className)}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {leading != null && <div className="ios27-list-row-leading">{leading}</div>}
      <div className="ios27-list-row-content text-body">{children}</div>
      {trailing != null && (
        <div className="ios27-list-row-trailing text-body text-secondary">{trailing}</div>
      )}
      {disclosure && (
        <div className="ios27-list-row-disclosure text-tertiary" aria-hidden="true">
          &#8250;
        </div>
      )}
    </div>
  )
})
