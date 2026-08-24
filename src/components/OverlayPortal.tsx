import React from 'react';
import { createPortal } from 'react-dom';

interface OverlayPortalProps {
  children: React.ReactNode;
}

export default function OverlayPortal({ children }: OverlayPortalProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
