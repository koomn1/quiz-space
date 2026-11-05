import type { ReactNode, ReactPortal } from 'react'
import { createPortal } from 'react-dom'

export interface PortalProps {
  children: ReactNode
  /** Mount target. Defaults to `document.body`. */
  container?: Element | DocumentFragment | null
}

/**
 * SSR-safe portal. Renders nothing on the server; on the client it mounts
 * `children` into `container` (default `document.body`) **synchronously** in the
 * same commit.
 *
 * Synchronous mount matters: overlay components (Alert, Sheet, ContextMenu)
 * attach a ref to the portaled element and install a focus trap / measure it in
 * effects. A deferred mount would leave that ref null when the effect first runs.
 */
export function Portal({ children, container }: PortalProps): ReactPortal | null {
  if (typeof document === 'undefined') return null
  return createPortal(children, container ?? document.body)
}
