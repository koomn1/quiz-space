import { describe, expect, it } from 'vitest';
import { ellipsePoint, linePoint, penTipForNode, rectPerimeterPoint } from './penTip';
import type { WhiteboardNode } from './lessonSchema';

describe('rectPerimeterPoint', () => {
  it('starts at the top-left corner and walks clockwise', () => {
    expect(rectPerimeterPoint(10, 20, 100, 50, 0)).toEqual({ x: 10, y: 20 });
    // quarter of the 300 perimeter = 75 along the top edge
    expect(rectPerimeterPoint(10, 20, 100, 50, 0.25)).toEqual({ x: 85, y: 20 });
    // half = 100 top + 50 right = bottom-right corner
    expect(rectPerimeterPoint(10, 20, 100, 50, 0.5)).toEqual({ x: 110, y: 70 });
    // full loop returns to the start
    const end = rectPerimeterPoint(10, 20, 100, 50, 1);
    expect(end.x).toBeCloseTo(10);
    expect(end.y).toBeCloseTo(20);
  });

  it('clamps out-of-range progress', () => {
    expect(rectPerimeterPoint(0, 0, 10, 10, -1)).toEqual({ x: 0, y: 0 });
    expect(rectPerimeterPoint(0, 0, 10, 10, 2).x).toBeCloseTo(0);
  });
});

describe('ellipsePoint', () => {
  it('starts at 3 o\'clock and runs clockwise', () => {
    expect(ellipsePoint(100, 100, 40, 20, 0)).toEqual({ x: 140, y: 100 });
    const down = ellipsePoint(100, 100, 40, 20, 0.25);
    expect(down.x).toBeCloseTo(100);
    expect(down.y).toBeCloseTo(120);
  });
});

describe('linePoint', () => {
  it('interpolates between the endpoints', () => {
    expect(linePoint(0, 0, 100, 50, 0.5)).toEqual({ x: 50, y: 25 });
    expect(linePoint(0, 0, 100, 50, 1)).toEqual({ x: 100, y: 50 });
  });
});

describe('penTipForNode', () => {
  const base: WhiteboardNode = { id: 'n', type: 'line', x: 0, y: 0, x2: 10, y2: 0, color: 'ink' };
  it('follows lines and arrows to their current head', () => {
    expect(penTipForNode(base, 0.5, false)).toEqual({ x: 5, y: 0 });
    expect(penTipForNode({ ...base, type: 'arrow' }, 1, false)).toEqual({ x: 10, y: 0 });
  });
  it('leads the highlight edge, right-to-left for Arabic', () => {
    const h: WhiteboardNode = { id: 'h', type: 'highlight', x: 100, y: 40, w: 200, h: 30, color: 'accent' };
    expect(penTipForNode(h, 0.5, false)).toEqual({ x: 200, y: 55 });
    expect(penTipForNode(h, 0.5, true)).toEqual({ x: 200, y: 55 });
    expect(penTipForNode(h, 0.25, true)).toEqual({ x: 250, y: 55 });
  });
  it('returns null for text (measured in the DOM)', () => {
    expect(penTipForNode({ id: 't', type: 'text', x: 0, y: 0, text: 'hi', color: 'ink' }, 0.5, false)).toBeNull();
  });
});
