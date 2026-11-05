import {
  forwardRef,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn, useControllableState } from '../../lib'

export type TextFieldType = 'text' | 'email' | 'password' | 'number' | 'search'

export interface TextFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'type'
  > {
  /** Controlled value. Pair with `onChange`. */
  value?: string
  /** Initial value for uncontrolled usage. */
  defaultValue?: string
  /** Notified with the next string value on every input change and on clear. */
  onChange?: (value: string) => void
  /** Optional field label rendered above the input and tied to it via `htmlFor`. */
  label?: ReactNode
  /** @default '' */
  placeholder?: string
  /** @default 'text' */
  type?: TextFieldType
  /** @default false */
  disabled?: boolean
  /**
   * When true, renders a trailing Clear button while the value is non-empty.
   * Clearing empties the value and returns focus to the input.
   * @default false
   */
  clearable?: boolean
}

/**
 * iOS 27 TextField. A labelled native `<input>` with an optional clear button.
 *
 * Controllable value (`value`/`defaultValue` + `onChange`). The `<label>` is
 * associated with the input via a generated `id` (`React.useId`). When
 * `clearable` and the value is non-empty, a Clear button (`aria-label="Clear"`)
 * appears; activating it empties the field and refocuses the input.
 *
 * Accessibility: real `<label>`/`<input>` semantics, visible `:focus-visible`
 * ring, `disabled` handling, and a reduced-motion guard on the clear button.
 *
 * @example
 * <TextField label="Email" type="email" clearable value={email} onChange={setEmail} />
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      value,
      defaultValue,
      onChange,
      label,
      placeholder = '',
      type = 'text',
      disabled = false,
      clearable = false,
      id,
      className,
      ...rest
    },
    ref,
  ) {
    const [current, setCurrent] = useControllableState<string>({
      value,
      defaultValue: defaultValue ?? '',
      onChange,
    })

    const generatedId = useId()
    const inputId = id ?? generatedId

    // Local ref so Clear can refocus the input, while still forwarding `ref`.
    const innerRef = useRef<HTMLInputElement | null>(null)
    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }

    const showClear = clearable && current.length > 0 && !disabled

    const handleClear = () => {
      setCurrent('')
      innerRef.current?.focus()
    }

    return (
      <div className={cn('ios27-textfield', disabled && 'ios27-textfield--disabled', className)}>
        {label != null && (
          <label className="ios27-textfield-label text-subheadline text-secondary" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="ios27-textfield-field">
          <input
            ref={setRefs}
            id={inputId}
            className="ios27-textfield-input text-body"
            type={type}
            value={current}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => setCurrent(e.currentTarget.value)}
            {...rest}
          />
          {showClear && (
            <button
              type="button"
              className="ios27-textfield-clear"
              aria-label="Clear"
              onClick={handleClear}
              tabIndex={-1}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          )}
        </div>
      </div>
    )
  },
)
