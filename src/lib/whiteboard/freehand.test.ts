import { describe, expect, it } from 'vitest';
import { appendPoint, boardPoint, pointsToPath } from './freehand';

describe('pointsToPath', () => {
  it('is empty for no points, a dot for one, smoothed curves for many', () => {
    expect(pointsToPath([])).toBe('');
    expect(pointsToPath([{ x: 10, y: 20 }])).toBe('M 10 20 L 10.5 20');
    const d = pointsToPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 10 }]);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d).toContain('Q 10 0 15 5');
    expect(d.endsWith('L 20 10')).toBe(true);
  });
});

describe('boardPoint', () => {
  const rect = { left: 100, top: 50, width: 640, height: 360 };
  const canvas = { width: 1280, height: 720 };
  it('maps client pixels into board coordinates', () => {
    expect(boardPoint(100, 50, rect, canvas)).toEqual({ x: 0, y: 0 });
    expect(boardPoint(420, 230, rect, canvas)).toEqual({ x: 640, y: 360 });
    expect(boardPoint(740, 410, rect, canvas)).toEqual({ x: 1280, y: 720 });
  });
  it('clamps to the canvas edges', () => {
    expect(boardPoint(0, 0, rect, canvas)).toEqual({ x: 0, y: 0 });
    expect(boardPoint(2000, 900, rect, canvas)).toEqual({ x: 1280, y: 720 });
  });
});

describe('appendPoint', () => {
  it('drops points that barely moved', () => {
    const pts = [{ x: 0, y: 0 }];
    expect(appendPoint(pts, { x: 1, y: 1 })).toHaveLength(1);
    expect(appendPoint(pts, { x: 10, y: 0 })).toHaveLength(2);
  });
});
