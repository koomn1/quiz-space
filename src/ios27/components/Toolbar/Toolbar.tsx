import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib'

export interface ToolbarProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Bar title. Also used as the large title text when `largeTitle` is set. */
  title: string
  /**
   * Render an iOS Large Title below the bar. The large title is hidden once the
   * bar collapses (see `scrollY`).
   * @default false
   */
  largeTitle?: boolean
  /**
   * Scroll offset of the parent scroll container (parent-driven). The bar is
   * considered collapsed when `scrollY > 44`, which hides the large title.
   * @default 0
   */
  scrollY?: number
  /** Leading action slot (e.g. a back button). */
  leading?: ReactNode
  /** Trailing action slot (e.g. an edit / done button). */
  trailing?: ReactNode
}

/** Collapse threshold (px) — matches the iOS large-title collapse point. */
const COLLAPSE_THRESHOLD = 44

/**
 * iOS 27 Toolbar (top navigation bar) on a Liquid Glass surface, with an optional
 * Large Title mode and leading/trailing action slots.
 *
 * The large title is rendered below the bar while `largeTitle` is set and the bar
 * is not collapsed. Collapse is parent-driven: pass the scroll container's
 * `scrollY`; the bar collapses (and the large title hides) once it exceeds 44px.
 *
 * Accessibility: semantic `<header>` with a labelled banner-style title; native
 * focusable content is provided via the `leading`/`trailing` slots.
 *
 * @example
 * <Toolbar
 *   title="Library"
 *   largeTitle
 *   scrollY={scrollY}
 *   leading={<Button variant="plain">Back</Button>}
 *   trailing={<Button variant="plain">Edit</Button>}
 * />
 */
export const Toolbar = forwardRef<HTMLElement, ToolbarProps>(function Toolbar(
  { title, largeTitle = false, scrollY = 0, leading, trailing, className, ...rest },
  ref,
) {
  const collapsed = scrollY > COLLAPSE_THRESHOLD
  const showLargeTitle = largeTitle && !collapsed

  return (
    <header
      ref={ref}
      className={cn(
        'ios27-toolbar',
        'liquid-glass-large',
        collapsed && 'ios27-toolbar--collapsed',
        className,
      )}
      {...rest}
    >
      <div className="ios27-toolbar-bar">
        <div className="ios27-toolbar-leading">{leading}</div>
        <div className="ios27-toolbar-title text-headline">{title}</div>
        <div className="ios27-toolbar-trailing">{trailing}</div>
      </div>
      {showLargeTitle && (
        <div className="ios27-toolbar-large-title text-large-title emphasized">{title}</div>
      )}
    </header>
  )
})
