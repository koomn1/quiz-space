import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib'

export interface PageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Fixed top region — typically a `<Toolbar>`. */
  toolbar?: ReactNode
  /** Fixed bottom region — typically a `<TabBar>`. */
  tabbar?: ReactNode
  /** Scrollable page content. */
  children: ReactNode
}

/**
 * iOS 27 Page. The standard full-height screen layout: a fixed toolbar, a
 * scrollable content area, and a fixed tab bar. The content area is a native
 * `<main>` landmark; toolbar/tabbar are `<header>`/`<footer>` landmarks when
 * present.
 *
 * @example
 * <Page toolbar={<Toolbar title="Settings" />} tabbar={<TabBar ... />}>
 *   <ListSection header="General">…</ListSection>
 * </Page>
 */
export const Page = forwardRef<HTMLDivElement, PageProps>(function Page(
  { toolbar, tabbar, children, className, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cn('ios27-page', className)} {...rest}>
      {toolbar != null && <header className="ios27-page-toolbar">{toolbar}</header>}
      <main className="ios27-page-content">{children}</main>
      {tabbar != null && <footer className="ios27-page-tabbar">{tabbar}</footer>}
    </div>
  )
})
