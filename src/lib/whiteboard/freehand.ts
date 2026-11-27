/** Learner freehand strokes drawn over the whiteboard. Pure board-coordinate math; the player owns pointer capture. */

export interface FreehandPoint { x: number; y: number }

export interface FreehandStroke {
  id: string;
  color: string;
  width: number;
  points: FreehandPoint[];
}

/** Round a coordinate to 0.1px so paths stay compact. */
const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Smooth polyline as an SVG path: quadratic curves through segment midpoints.
 * A single point becomes a tiny dot so taps are visible.
 */
export function pointsToPath(points: FreehandPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${r1(p.x)} ${r1(p.y)} L ${r1(p.x + 0.5)} ${r1(p.y)}`;
  }
  let d = `M ${r1(points[0].x)} ${r1(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${r1(points[i].x)} ${r1(points[i].y)} ${r1(mx)} ${r1(my)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${r1(last.x)} ${r1(last.y)}`;
  return d;
}

/** Convert a pointer position (client px) into board coordinates, clamped to the canvas. */
export function boardPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvas: { width: number; height: number },
): FreehandPoint {
  const x = ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
  const y = ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;
  return {
    x: r1(Math.min(canvas.width, Math.max(0, x))),
    y: r1(Math.min(canvas.height, Math.max(0, y))),
  };
}

/** Skip points closer than this (board px) so a stroke stays a handful of anchors. */
export const MIN_POINT_DIST = 3;

export function appendPoint(points: FreehandPoint[], p: FreehandPoint): FreehandPoint[] {
  const last = points[points.length - 1];
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_POINT_DIST) return points;
  return [...points, p];
}
