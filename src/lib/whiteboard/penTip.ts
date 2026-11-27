import type { WhiteboardNode } from './lessonSchema';

/**
 * Where the pen tip sits while a node is being drawn (progress 0..1).
 * Pure board-coordinate math; the player renders the pen marker at this point.
 * Text measuring needs the DOM, so text nodes are handled by RevealText itself.
 */
export interface Point { x: number; y: number }

/** SVG rect strokes (pathLength=1) start at the top-left corner and run clockwise. */
export function rectPerimeterPoint(x: number, y: number, w: number, h: number, progress: number): Point {
  const p = Math.min(1, Math.max(0, progress));
  let d = p * (2 * w + 2 * h);
  if (d <= w) return { x: x + d, y };
  d -= w;
  if (d <= h) return { x: x + w, y: y + d };
  d -= h;
  if (d <= w) return { x: x + w - d, y: y + h };
  d -= w;
  return { x, y: y + h - d };
}

/** SVG ellipse strokes (pathLength=1) start at 3 o'clock and run clockwise. */
export function ellipsePoint(cx: number, cy: number, rx: number, ry: number, progress: number): Point {
  const angle = 2 * Math.PI * Math.min(1, Math.max(0, progress));
  return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
}

export function linePoint(x: number, y: number, x2: number, y2: number, progress: number): Point {
  const p = Math.min(1, Math.max(0, progress));
  return { x: x + (x2 - x) * p, y: y + (y2 - y) * p };
}

/** Quadratic bezier point at progress (curve nodes). */
export function curvePoint(x: number, y: number, cx: number, cy: number, x2: number, y2: number, progress: number): Point {
  const p = Math.min(1, Math.max(0, progress));
  const u = 1 - p;
  return { x: u * u * x + 2 * u * p * cx + p * p * x2, y: u * u * y + 2 * u * p * cy + p * p * y2 };
}

/** Pen tip for shape and connector nodes; null for types whose tip is computed elsewhere (text). */
export function penTipForNode(node: WhiteboardNode, progress: number, rtl: boolean): Point | null {
  switch (node.type) {
    case 'rectangle':
      return rectPerimeterPoint(node.x, node.y, node.w ?? 0, node.h ?? 0, progress);
    case 'ellipse': {
      const rx = (node.w ?? 0) / 2;
      const ry = (node.h ?? 0) / 2;
      return ellipsePoint(node.x + rx, node.y + ry, rx, ry, progress);
    }
    case 'line':
    case 'arrow':
      return linePoint(node.x, node.y, node.x2 ?? node.x, node.y2 ?? node.y, progress);
    case 'curve':
      return curvePoint(node.x, node.y, node.cx ?? node.x, node.cy ?? node.y, node.x2 ?? node.x, node.y2 ?? node.y, progress);
    case 'highlight': {
      const w = (node.w ?? 0) * Math.min(1, Math.max(0, progress));
      return { x: rtl ? node.x + (node.w ?? 0) - w : node.x + w, y: node.y + (node.h ?? 0) / 2 };
    }
    default:
      return null;
  }
}
