import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn, useControllableState } from '../../lib'

export interface SliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'onInput' | 'value' | 'defaultValue' | 'type' | 'min' | 'max' | 'step'
  > {
  /** Controlled value. Provide together with `onChange`. */
  value?: number
  /** Initial value for uncontrolled usage. @default min */
  defaultValue?: number
  /** @default 0 */
  min?: number
  /** @default 100 */
  max?: number
  /** @default 1 */
  step?: number
  /** Disables the slider. */
  disabled?: boolean
  /** Content rendered before the track (e.g. an `Icon` or min label). */
  leading?: ReactNode
  /** Content rendered after the track (e.g. an `Icon` or max label). */
  trailing?: ReactNode
  /** Fired with the next value on every input (drag/keyboard). */
  onChange?: (value: number) => void
}

/**
 * iOS 27 Slider. A native `<input type="range">` styled with iOS tokens, so
 * keyboard operability and a11y come for free. Controllable (`value` + `onChange`)
 * or uncontrolled (`defaultValue`). Optional `leading`/`trailing` slots flank the
 * track for icons or min/max labels.
 *
 * Accessibility: native range semantics (`role="slider"` implicit, Arrow/Home/End
 * keys, screen-reader value announcement), visible `:focus-visible` ring, and a
 * reduced-motion–aware thumb transition.
 *
 * @example
 * const [vol, setVol] = useState(40)
 * <Slider value={vol} onChange={setVol} leading={<Icon>speaker</Icon>} />
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    leading,
    trailing,
    onChange,
    className,
    ...rest
  },
  ref,
) {
  const [current, setValue] = useControllableState<number>({
    value,
    defaultValue: defaultValue ?? min,
    onChange,
  })

  return (
    <div className={cn('ios27-slider', disabled && 'is-disabled', className)}>
      {leading !== undefined && leading !== null && (
        <div className="ios27-slider-leading">{leading}</div>
      )}
      <input
        ref={ref}
        type="range"
        className="ios27-slider-input"
        value={current}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => setValue(event.currentTarget.valueAsNumber)}
        {...rest}
      />
      {trailing !== undefined && trailing !== null && (
        <div className="ios27-slider-trailing">{trailing}</div>
      )}
    </div>
  )
})
