import {
  useId,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  cn,
  material,
  Portal,
  useControllableState,
  useFocusTrap,
} from '../../lib'

export type SheetDetent = 'medium' | 'large' | 'full'

/** Drag past this many px (downward) to dismiss the sheet on pointer release. */
const DISMISS_THRESHOLD = 150

export interface SheetProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onChange'> {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state for uncontrolled usage. @default false */
  defaultOpen?: boolean
  /** Notified whenever the open state changes (backdrop tap, drag, Escape). */
  onChange?: (open: boolean) => void
  /** Show the grabber pill at the top. @default true */
  grabber?: boolean
  /** Detent height: medium ~50vh · large ~85vh · full ~100vh. @default 'large' */
  detent?: SheetDetent
  /** Optional header title — labels the dialog. */
  title?: ReactNode
  /** Sheet body content. */
  children: ReactNode
  /** Called once when the sheet is dismissed (after `onChange(false)`). */
  onClose?: () => void
}

/**
 * iOS 27 Sheet. A bottom sheet rendered through a {@link Portal} with a focus
 * trap, backdrop scrim, grabber pill, detent heights, and pointer-driven
 * drag-to-dismiss.
 *
 * Accessibility: `role="dialog"` + `aria-modal`, `aria-labelledby` when `title`
 * is given, focus trapped while open (Tab cycles, Escape closes, focus restored
 * on close), and a reduced-motion–aware present/dismiss.
 *
 * Controllable: `open` / `defaultOpen` / `onChange`. Drag the sheet down past
 * ~150px and release to dismiss.
 *
 * @example
 * <Sheet open={open} onChange={setOpen} detent="medium" title="Filters">
 *   …content…
 * </Sheet>
 */
export function Sheet({
  open: openProp,
  defaultOpen = false,
  onChange,
  grabber = true,
  detent = 'large',
  title,
  children,
  onClose,
  className,
  style,
  ...rest
}: SheetProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange,
  })

  const [startY, setStartY] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const titleId = useId()

  const close = () => {
    setOpen(false)
    onClose?.()
  }

  const dialogRef = useFocusTrap<HTMLDivElement>(open, {
    onEscape: close,
    restoreFocus: true,
  })

  if (!open) return null

  const handleDragStart = (e: PointerEvent<HTMLDivElement>) => {
    // Only initiate drag from the grabber / header region (not interactive body).
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setStartY(e.clientY)
    setOffsetY(0)
  }

  const handleDragMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setOffsetY(Math.max(0, e.clientY - startY))
  }

  const handleDragEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
    if (offsetY > DISMISS_THRESHOLD) {
      close()
    }
    setOffsetY(0)
  }

  return (
    <Portal>
      <div className="ios27-sheet-backdrop" onClick={close}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title != null ? titleId : undefined}
          className={cn(
            'ios27-sheet',
            `ios27-sheet--${detent}`,
            dragging && 'is-dragging',
            material('thick'),
            className,
          )}
          onClick={(e: MouseEvent) => e.stopPropagation()}
          {...rest}
          style={{ ...style, transform: `translateY(${offsetY}px)` }}
        >
          <div
            className="ios27-sheet-handle"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            {grabber && <div className="ios27-sheet-grabber" aria-hidden="true" />}
            {title != null && (
              <div className="ios27-sheet-header">
                <h2 id={titleId} className="ios27-sheet-title text-headline">
                  {title}
                </h2>
              </div>
            )}
          </div>
          <div className="ios27-sheet-content">{children}</div>
        </div>
      </div>
    </Portal>
  )
}
