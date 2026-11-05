import {
  forwardRef,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react'
import { cn, Icon, useControllableState } from '../../lib'

export interface SearchBarProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'onInput' | 'onSubmit' | 'type'
  > {
  /** Controlled value. Pair with `onChange`. */
  value?: string
  /** Initial value for uncontrolled usage. */
  defaultValue?: string
  /** Notified with the next string value on every change. */
  onChange?: (value: string) => void
  /** @default 'Search' */
  placeholder?: string
  /** Notified with the current string value on every input event. */
  onInput?: (value: string) => void
  /** Notified with the current value when Enter is pressed. */
  onSubmit?: (value: string) => void
  /** Notified when the Cancel button is activated (after the value is cleared). */
  onCancel?: () => void
}

/**
 * iOS 27 SearchBar. A native `<input type="search">` with a leading search
 * glyph and a Cancel button that slides in while the field is focused.
 *
 * Controllable value (`value`/`defaultValue` + `onChange`). Focusing reveals
 * Cancel; activating Cancel clears the value, blurs the input, and fires
 * `onCancel`. Pressing Enter fires `onSubmit` with the current value.
 *
 * Accessibility: `role="search"` container, real `<input type="search">`,
 * decorative search `<Icon>`, visible `:focus-visible` ring, and a
 * reduced-motion guard on the Cancel slide-in.
 *
 * @example
 * <SearchBar value={q} onChange={setQ} onSubmit={runSearch} />
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      defaultValue,
      onChange,
      placeholder = 'Search',
      onInput,
      onSubmit,
      onCancel,
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
    const [focused, setFocused] = useState(false)

    // Wrapper ref so blur can tell whether focus left the SearchBar entirely
    // (e.g. tabbing to Cancel keeps it open; tabbing away closes it).
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    // Local ref so Cancel can blur the input, while still forwarding `ref`.
    const innerRef = useRef<HTMLInputElement | null>(null)
    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }

    const handleCancel = () => {
      setCurrent('')
      setFocused(false)
      innerRef.current?.blur()
      onCancel?.()
    }

    return (
      <div
        ref={wrapperRef}
        role="search"
        className={cn('ios27-searchbar', focused && 'is-focused', className)}
        onBlur={(e) => {
          // Fires for input AND Cancel (onBlur delegates via focusout). Close only
          // when focus leaves the SearchBar entirely (covers tabbing away from Cancel).
          if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
            setFocused(false)
          }
        }}
      >
        <div className="ios27-searchbar-field">
          <Icon size="sm" className="ios27-searchbar-icon text-tertiary">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <line
                x1="10.8"
                y1="10.8"
                x2="14"
                y2="14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Icon>
          <input
            ref={setRefs}
            type="search"
            className="ios27-searchbar-input text-body"
            value={current}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              const next = e.currentTarget.value
              setCurrent(next)
              onInput?.(next)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit?.(current)
            }}
            {...rest}
          />
        </div>
        {focused && (
          <button
            type="button"
            className="ios27-searchbar-cancel text-body"
            // Keep input focus during the click so the button doesn't unmount first.
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}
      </div>
    )
  },
)
