import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn, useControllableState } from '../../lib'

export interface ToggleProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onChange' | 'value' | 'defaultValue' | 'children' | 'role' | 'aria-checked'
  > {
  /** Controlled on/off state. Provide together with `onChange`. */
  checked?: boolean
  /** Initial state for uncontrolled usage. @default false */
  defaultChecked?: boolean
  /** Disables the switch. */
  disabled?: boolean
  /** Optional visible label rendered next to the switch and associated with it. */
  label?: ReactNode
  /** Fired with the next checked state on every toggle. */
  onChange?: (checked: boolean) => void
}

/**
 * iOS 27 Toggle. A switch implemented as a native `<button role="switch">` with
 * `aria-checked`. Controllable (`checked` + `onChange`) or uncontrolled
 * (`defaultChecked`). When `label` is provided it is rendered inside an associated
 * `<label>` so clicking the text also flips the switch.
 *
 * Accessibility: `role="switch"` + `aria-checked`, full keyboard operability
 * (native button = Space/Enter), visible `:focus-visible` ring, reduced-motion–aware
 * thumb animation, and `aria-labelledby` wiring when `label` is given.
 *
 * @example
 * const [on, setOn] = useState(false)
 * <Toggle checked={on} onChange={setOn} label="Wi-Fi" />
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  {
    checked,
    defaultChecked = false,
    disabled = false,
    label,
    onChange,
    onClick,
    className,
    ...rest
  },
  ref,
) {
  const [isChecked, setChecked] = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked,
    onChange,
  })

  const labelId = useId()
  const hasLabel = label !== undefined && label !== null && label !== false

  const button = (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-labelledby={hasLabel ? labelId : undefined}
      disabled={disabled}
      className={cn('ios27-toggle', isChecked && 'is-checked', className)}
      {...rest}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setChecked(!isChecked)
      }}
    >
      <span className="ios27-toggle-thumb" aria-hidden="true" />
    </button>
  )

  if (!hasLabel) return button

  return (
    <label className="ios27-toggle-wrapper">
      <span id={labelId} className="ios27-toggle-label text-body">
        {label}
      </span>
      {button}
    </label>
  )
})
