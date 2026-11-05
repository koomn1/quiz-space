import {
  forwardRef,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn, useControllableState, Icon } from '../../lib'

export interface TabBarItem {
  /** Stable identifier — used as the controllable `active` value. */
  id: string
  /** Visible label below the icon. */
  label: string
  /** Decorative glyph (SVG / symbol character / emoji) rendered in `<Icon>`. */
  icon: ReactNode
}

export interface TabBarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange' | 'defaultValue'> {
  /** Tab items, rendered left-to-right. */
  items: TabBarItem[]
  /** Controlled active tab id. */
  active?: string
  /** Initial active tab id (uncontrolled). Defaults to the first item. */
  defaultActive?: string
  /** Fires with the newly selected tab id. */
  onChange?: (id: string) => void
}

/**
 * iOS 27 TabBar — a floating bottom tab bar on a Liquid Glass surface.
 *
 * Controllable via `active` / `defaultActive` / `onChange`. Each tab renders a
 * decorative icon over a caption label.
 *
 * Accessibility: `<nav>` with `role="tablist"`; each tab is a real `<button>`
 * with `role="tab"` + `aria-selected`. Left/Right arrow keys move selection
 * between tabs (roving), Home/End jump to the first/last tab.
 *
 * @example
 * <TabBar
 *   items={[{ id: 'home', label: 'Home', icon: '􀎟' }, ...]}
 *   defaultActive="home"
 *   onChange={setTab}
 * />
 */
export const TabBar = forwardRef<HTMLElement, TabBarProps>(function TabBar(
  { items, active, defaultActive, onChange, className, ...rest },
  ref,
) {
  const fallback = items[0]?.id ?? ''
  const [value, setValue] = useControllableState<string>({
    value: active,
    defaultValue: defaultActive ?? fallback,
    onChange,
  })

  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

  const select = (id: string) => {
    if (id !== value) setValue(id)
  }

  const focusIndex = (index: number) => {
    const count = items.length
    if (count === 0) return
    const next = ((index % count) + count) % count
    const target = items[next]
    if (!target) return
    buttonsRef.current[next]?.focus()
    select(target.id)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusIndex(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusIndex(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusIndex(0)
        break
      case 'End':
        event.preventDefault()
        focusIndex(items.length - 1)
        break
      default:
        break
    }
  }

  return (
    <nav
      ref={ref}
      role="tablist"
      className={cn('ios27-tabbar', 'liquid-glass-large', className)}
      {...rest}
    >
      {items.map((item, index) => {
        const isActive = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            ref={(node) => {
              buttonsRef.current[index] = node
            }}
            className={cn('ios27-tabbar-item', isActive && 'is-active')}
            onClick={() => select(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <Icon className="ios27-tabbar-icon" size="lg">
              {item.icon}
            </Icon>
            <span className="ios27-tabbar-label text-caption2">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
})
