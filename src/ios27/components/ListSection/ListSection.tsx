import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib'

export interface ListSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Optional section header label (rendered `.text-footnote.text-secondary`). */
  header?: ReactNode
  /** Optional section footer label (rendered `.text-footnote.text-secondary`). */
  footer?: ReactNode
  /** Rows — typically a sequence of `<ListRow>` elements. */
  children: ReactNode
}

/**
 * iOS 27 ListSection. Groups `<ListRow>` children inside a rounded, clipped
 * grouped container with an optional header and footer.
 *
 * Accessibility: renders a native `<section>`; when a `header` string is given
 * it is wired as the section's `aria-label`-equivalent via the header element.
 *
 * @example
 * <ListSection header="General" footer="These settings apply system-wide.">
 *   <ListRow>Wi-Fi</ListRow>
 *   <ListRow separator={false}>Bluetooth</ListRow>
 * </ListSection>
 */
export const ListSection = forwardRef<HTMLElement, ListSectionProps>(function ListSection(
  { header, footer, children, className, ...rest },
  ref,
) {
  return (
    <section ref={ref} className={cn('ios27-list-section', className)} {...rest}>
      {header != null && (
        <div className="ios27-list-section-header text-footnote text-secondary">{header}</div>
      )}
      <div className="ios27-list-section-content">{children}</div>
      {footer != null && (
        <div className="ios27-list-section-footer text-footnote text-secondary">{footer}</div>
      )}
    </section>
  )
})
