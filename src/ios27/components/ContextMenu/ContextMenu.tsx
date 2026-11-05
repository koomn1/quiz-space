import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { cn, material, Portal, useFocusTrap } from '../../lib'

export interface ContextMenuItem {
  /** Item label. */
  label: string
  /** Optional leading glyph (character / emoji / inline SVG). */
  icon?: ReactNode
  /** Render with destructive (red) styling. */
  destructive?: boolean
  /** Invoked when the item is selected (before the menu closes). */
  onClick: () => void
}

export interface ContextMenuGroup {
  /** Items within this group. Groups are separated by a divider. */
  items: ContextMenuItem[]
}

/** Margin kept between the clamped menu and the viewport edge. */
const VIEWPORT_MARGIN = 8

export interface ContextMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Grouped menu actions; groups render with a separator between them. */
  groups: ContextMenuGroup[]
  /** The trigger. Right-click / long-press it to open the menu at the cursor. */
  children: ReactNode
}

/**
 * iOS 27 ContextMenu. Wraps a trigger; a right-click (`contextmenu`) opens a
 * floating `role="menu"` at the cursor through a {@link Portal}, with a focus
 * trap, Arrow-key navigation, and viewport clamping.
 *
 * Accessibility: `role="menu"` + `role="menuitem"`, focus trapped while open
 * (Tab cycles, Escape closes, focus restored on close), ArrowUp/ArrowDown move
 * between items (Home/End jump), and a reduced-motion–aware open/close.
 *
 * @example
 * <ContextMenu
 *   groups={[
 *     { items: [{ label: 'Copy', onClick: copy }] },
 *     { items: [{ label: 'Delete', destructive: true, onClick: remove }] },
 *   ]}
 * >
 *   <div>Right-click me</div>
 * </ContextMenu>
 */
export function ContextMenu({
  groups,
  children,
  className,
  onContextMenu,
  ...rest
}: ContextMenuProps) {
  const [open, setOpen] = useState(false)
  // Raw cursor anchor where the menu was opened.
  const [anchor, setAnchor] = useState({ x: 0, y: 0 })
  // Clamped position actually applied to the floating menu.
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const close = useCallback(() => setOpen(false), [])
  const menuRef = useFocusTrap<HTMLDivElement>(open, {
    onEscape: close,
    restoreFocus: true,
  })
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Reset the per-render item registry; refs are repopulated below.
  itemRefs.current = []

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    onContextMenu?.(e)
    if (e.defaultPrevented) return
    e.preventDefault()
    const next = { x: e.clientX, y: e.clientY }
    setAnchor(next)
    setPos(next)
    setOpen(true)
  }

  // Clamp the menu within the viewport once its real size is known. Keyed on the
  // anchor (not the clamped `pos`) so it cannot feed back into itself.
  useLayoutEffect(() => {
    if (!open) return
    const node = menuRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - VIEWPORT_MARGIN
    const maxY = window.innerHeight - rect.height - VIEWPORT_MARGIN
    setPos({
      x: Math.max(VIEWPORT_MARGIN, Math.min(anchor.x, maxX)),
      y: Math.max(VIEWPORT_MARGIN, Math.min(anchor.y, maxY)),
    })
  }, [open, anchor, menuRef])

  // Close on scroll / resize / blur-out.
  useEffect(() => {
    if (!open) return
    const onDismiss = () => close()
    window.addEventListener('resize', onDismiss)
    window.addEventListener('scroll', onDismiss, true)
    return () => {
      window.removeEventListener('resize', onDismiss)
      window.removeEventListener('scroll', onDismiss, true)
    }
  }, [open, close])

  const focusItem = (index: number) => {
    const count = itemRefs.current.length
    if (count === 0) return
    const wrapped = ((index % count) + count) % count
    itemRefs.current[wrapped]?.focus()
  }

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current
    if (items.length === 0) return
    const currentIndex = items.findIndex((el) => el === document.activeElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusItem(currentIndex < 0 ? 0 : currentIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusItem(currentIndex < 0 ? items.length - 1 : currentIndex - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusItem(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusItem(items.length - 1)
    }
  }

  const handleSelect = (item: ContextMenuItem) => {
    item.onClick()
    close()
  }

  let itemIndex = -1

  return (
    <>
      <div
        className={cn('ios27-context-menu-trigger', className)}
        onContextMenu={handleContextMenu}
        {...rest}
      >
        {children}
      </div>

      {open && (
        <Portal>
          <div className="ios27-context-menu-backdrop" onClick={close}>
            <div
              ref={menuRef}
              role="menu"
              aria-orientation="vertical"
              className={cn('ios27-context-menu', material('thick'))}
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
              onClick={(e: MouseEvent) => e.stopPropagation()}
              onKeyDown={handleMenuKeyDown}
            >
              {groups.map((group, gi) => (
                <div className="ios27-context-menu-group" key={gi}>
                  {gi > 0 && (
                    <div
                      className="ios27-context-menu-separator"
                      role="separator"
                    />
                  )}
                  {group.items.map((item) => {
                    itemIndex += 1
                    const index = itemIndex
                    return (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        ref={(el) => {
                          itemRefs.current[index] = el
                        }}
                        className={cn(
                          'ios27-context-menu-item',
                          'text-body',
                          item.destructive &&
                            'ios27-context-menu-item--destructive',
                        )}
                        onClick={() => handleSelect(item)}
                      >
                        <span className="ios27-context-menu-label">
                          {item.label}
                        </span>
                        {item.icon != null && (
                          <span
                            className="ios27-context-menu-icon"
                            aria-hidden="true"
                          >
                            {item.icon}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
