import {
  useId,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import {
  cn,
  material,
  Portal,
  useControllableState,
  useFocusTrap,
} from '../../lib'

export type AlertActionStyle = 'default' | 'cancel' | 'destructive'

export interface AlertAction {
  /** Button label. */
  label: string
  /**
   * iOS alert button appearance.
   * - `default` — regular blue label
   * - `cancel` — emphasized (semibold) blue label
   * - `destructive` — red label
   * @default 'default'
   */
  style?: AlertActionStyle
  /** Invoked when the action is selected (before the alert closes). */
  onClick: () => void
}

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onChange'> {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state for uncontrolled usage. @default false */
  defaultOpen?: boolean
  /** Notified whenever the open state changes (backdrop tap, action, Escape). */
  onChange?: (open: boolean) => void
  /** Alert title — labels the dialog (`aria-labelledby`). */
  title: ReactNode
  /** Optional secondary message — describes the dialog (`aria-describedby`). */
  message?: ReactNode
  /** Action buttons rendered as a row (or stacked when 3+). */
  actions: AlertAction[]
}

/**
 * iOS 27 Alert. A modal `alertdialog` rendered through a {@link Portal} with a
 * focus trap, backdrop scrim, and title/message/actions.
 *
 * Accessibility: `role="alertdialog"` + `aria-modal`, `aria-labelledby` (title)
 * and `aria-describedby` (message), focus trapped while open (Tab cycles, Escape
 * closes, focus restored on close), and a reduced-motion–aware present/dismiss.
 *
 * Controllable: `open` / `defaultOpen` / `onChange`.
 *
 * @example
 * <Alert
 *   open={open}
 *   onChange={setOpen}
 *   title="Delete item?"
 *   message="This cannot be undone."
 *   actions={[
 *     { label: 'Cancel', style: 'cancel', onClick: () => {} },
 *     { label: 'Delete', style: 'destructive', onClick: remove },
 *   ]}
 * />
 */
export function Alert({
  open: openProp,
  defaultOpen = false,
  onChange,
  title,
  message,
  actions,
  className,
  ...rest
}: AlertProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange,
  })

  const titleId = useId()
  const messageId = useId()

  const close = () => setOpen(false)
  const dialogRef = useFocusTrap<HTMLDivElement>(open, {
    onEscape: close,
    restoreFocus: true,
  })

  if (!open) return null

  const handleAction = (action: AlertAction) => {
    action.onClick()
    close()
  }

  const stacked = actions.length > 2

  return (
    <Portal>
      <div className="ios27-alert-backdrop" onClick={close}>
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={message != null ? messageId : undefined}
          className={cn('ios27-alert', material('thick'), className)}
          onClick={(e: MouseEvent) => e.stopPropagation()}
          {...rest}
        >
          <div className="ios27-alert-content">
            <h2 id={titleId} className="ios27-alert-title text-headline">
              {title}
            </h2>
            {message != null && (
              <p
                id={messageId}
                className="ios27-alert-message text-footnote text-secondary"
              >
                {message}
              </p>
            )}
          </div>
          <div
            className={cn(
              'ios27-alert-actions',
              stacked && 'ios27-alert-actions--stacked',
            )}
          >
            {actions.map((action, i) => (
              <button
                key={`${action.label}-${i}`}
                type="button"
                className={cn(
                  'ios27-alert-action',
                  'text-body',
                  action.style === 'cancel' && 'ios27-alert-action--cancel',
                  action.style === 'destructive' &&
                    'ios27-alert-action--destructive',
                )}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  )
}
