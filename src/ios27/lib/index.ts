/**
 * Shared primitives for iOS 27 React components.
 *
 * CONTRACT (Phase 0 — frozen): components import from `../../lib` only.
 * Component agents MUST NOT add files here or change these signatures.
 */

export { cn, type ClassValue } from './cn'
export {
  useControllableState,
  type UseControllableStateParams,
} from './useControllableState'
export { Portal, type PortalProps } from './Portal'
export { useFocusTrap, type UseFocusTrapOptions } from './useFocusTrap'
export { Icon, type IconProps, type IconSize } from './Icon'
export { material, glass, type Material, type Glass } from './material'
