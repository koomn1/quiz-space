import {
  forwardRef,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react'
import { cn, useControllableState } from '../../lib'

export interface SegmentedControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Segment labels, rendered left-to-right. */
  segments: string[]
  /** Controlled selected segment index. */
  selected?: number
  /** Initial selected segment index (uncontrolled). @default 0 */
  defaultSelected?: number
  /** Fires with the newly selected segment index. */
  onChange?: (index: number) => void
}

/**
 * iOS 27 Segmented Control — a horizontal single-select between mutually
 * exclusive options.
 *
 * Controllable via `selected` / `defaultSelected` / `onChange` (index-based).
 *
 * Accessibility: container `role="tablist"`; each segment is a real `<button>`
 * with `role="tab"` + `aria-selected`. Left/Right arrow keys move selection
 * (roving), Home/End jump to the first/last segment.
 *
 * @example
 * <SegmentedControl
 *   segments={['Day', 'Week', 'Month']}
 *   defaultSelected={0}
 *   onChange={setRange}
 * />
 */
export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(
    { segments, selected, defaultSelected, onChange, className, ...rest },
    ref,
  ) {
    const [value, setValue] = useControllableState<number>({
      value: selected,
      defaultValue: defaultSelected ?? 0,
      onChange,
    })

    const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

    const select = (index: number) => {
      if (index !== value) setValue(index)
    }

    const focusIndex = (index: number) => {
      const count = segments.length
      if (count === 0) return
      const next = ((index % count) + count) % count
      buttonsRef.current[next]?.focus()
      select(next)
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
          focusIndex(segments.length - 1)
          break
        default:
          break
      }
    }

    return (
      <div ref={ref} role="tablist" className={cn('ios27-segmented', className)} {...rest}>
        {segments.map((label, index) => {
          const isActive = index === value
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              ref={(node) => {
                buttonsRef.current[index] = node
              }}
              className={cn(
                'ios27-segmented-item',
                'text-subheadline',
                isActive && 'is-active',
              )}
              onClick={() => select(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {label}
            </button>
          )
        })}
      </div>
    )
  },
)
