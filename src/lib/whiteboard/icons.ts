/**
 * Illustration library for icon whiteboard nodes. Every icon is hand-drawn stroke art on a 200x200
 * grid, scaled into the node's box by the player. Anchors are named points a label can attach to,
 * so a lesson can ask "what is this?" with a teaser "?" before the label is revealed.
 */

export const ICON_NAMES = ['heart', 'cell', 'atom', 'plant', 'earth', 'brain'] as const;
export type IconName = (typeof ICON_NAMES)[number];

export type IconPart =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number };

export interface IconDef {
  viewBox: number;
  parts: IconPart[];
  anchors: Record<string, { x: number; y: number }>;
}

export const ICONS: Record<IconName, IconDef> = {
  heart: {
    viewBox: 200,
    parts: [
      { kind: 'path', d: 'M100 172 C78 150 32 118 32 72 C32 44 54 26 78 30 C92 33 99 44 100 56 C101 44 108 33 122 30 C146 26 168 44 168 72 C168 118 122 150 100 172 Z' },
    ],
    anchors: {
      top: { x: 100, y: 26 },
      bottom: { x: 100, y: 178 },
      left: { x: 28, y: 75 },
      right: { x: 172, y: 75 },
    },
  },
  cell: {
    viewBox: 200,
    parts: [
      { kind: 'ellipse', cx: 100, cy: 100, rx: 86, ry: 68 },
      { kind: 'circle', cx: 100, cy: 100, r: 26 },
      { kind: 'circle', cx: 100, cy: 100, r: 10 },
      { kind: 'ellipse', cx: 52, cy: 66, rx: 14, ry: 8, rotate: -30 },
      { kind: 'ellipse', cx: 150, cy: 140, rx: 14, ry: 8, rotate: -25 },
      { kind: 'ellipse', cx: 152, cy: 62, rx: 9, ry: 9 },
      { kind: 'ellipse', cx: 48, cy: 138, rx: 9, ry: 9 },
    ],
    anchors: {
      membrane: { x: 186, y: 100 },
      nucleus: { x: 100, y: 100 },
      cytoplasm: { x: 62, y: 150 },
    },
  },
  atom: {
    viewBox: 200,
    parts: [
      { kind: 'circle', cx: 100, cy: 100, r: 14 },
      { kind: 'ellipse', cx: 100, cy: 100, rx: 84, ry: 32 },
      { kind: 'ellipse', cx: 100, cy: 100, rx: 84, ry: 32, rotate: 60 },
      { kind: 'ellipse', cx: 100, cy: 100, rx: 84, ry: 32, rotate: -60 },
      { kind: 'circle', cx: 184, cy: 100, r: 6 },
      { kind: 'circle', cx: 58, cy: 173, r: 6 },
      { kind: 'circle', cx: 58, cy: 27, r: 6 },
    ],
    anchors: {
      nucleus: { x: 100, y: 100 },
      electron: { x: 184, y: 92 },
      orbit: { x: 100, y: 64 },
    },
  },
  plant: {
    viewBox: 200,
    parts: [
      { kind: 'line', x1: 100, y1: 180, x2: 100, y2: 60 },
      { kind: 'path', d: 'M100 130 C70 128 52 110 50 86 C76 88 96 104 100 130 Z' },
      { kind: 'path', d: 'M100 110 C130 108 148 90 150 66 C124 68 104 84 100 110 Z' },
      { kind: 'circle', cx: 100, cy: 44, r: 16 },
      { kind: 'path', d: 'M84 180 C90 168 96 162 100 160 C104 162 110 168 116 180' },
      { kind: 'line', x1: 60, y1: 180, x2: 140, y2: 180 },
    ],
    anchors: {
      flower: { x: 100, y: 24 },
      leaf: { x: 152, y: 66 },
      stem: { x: 108, y: 120 },
      root: { x: 100, y: 186 },
    },
  },
  earth: {
    viewBox: 200,
    parts: [
      { kind: 'circle', cx: 100, cy: 100, r: 82 },
      { kind: 'path', d: 'M100 18 C 60 60 60 140 100 182' },
      { kind: 'path', d: 'M100 18 C 140 60 140 140 100 182' },
      { kind: 'ellipse', cx: 100, cy: 100, rx: 82, ry: 26 },
      { kind: 'path', d: 'M46 66 C 58 56 76 58 82 70 C 88 82 74 92 60 90 C 46 88 38 76 46 66 Z' },
      { kind: 'path', d: 'M120 120 C 136 112 156 118 158 134 C 160 150 142 158 128 150 C 114 142 108 128 120 120 Z' },
    ],
    anchors: {
      pole: { x: 100, y: 14 },
      equator: { x: 178, y: 118 },
      continent: { x: 64, y: 60 },
      ocean: { x: 140, y: 160 },
    },
  },
  brain: {
    viewBox: 200,
    parts: [
      { kind: 'path', d: 'M100 34 C70 20 40 34 36 62 C20 70 18 96 32 108 C24 126 38 148 60 148 C66 166 90 172 100 158 C110 172 134 166 140 148 C162 148 176 126 168 108 C182 96 180 70 164 62 C160 34 130 20 100 34 Z' },
      { kind: 'path', d: 'M100 34 C 96 70 104 120 100 158' },
      { kind: 'path', d: 'M62 66 C 74 62 84 68 84 80' },
      { kind: 'path', d: 'M138 66 C 126 62 116 68 116 80' },
      { kind: 'path', d: 'M58 116 C 70 112 82 116 86 126' },
      { kind: 'path', d: 'M142 116 C 130 112 118 116 114 126' },
    ],
    anchors: {
      left: { x: 30, y: 100 },
      right: { x: 170, y: 100 },
      fissure: { x: 100, y: 96 },
      top: { x: 100, y: 26 },
    },
  },
};

/** Safe path-data alphabet: drawing commands, numbers, separators. Nothing else ever reaches the SVG. */
const SAFE_PATH = /^[MmLlHhVvCcQqSsTtAaZz0-9,.\s+-]+$/;
export const MAX_PATH_LENGTH = 800;

export function isSafePathData(d: unknown): d is string {
  return typeof d === 'string' && d.length >= 4 && d.length <= MAX_PATH_LENGTH && SAFE_PATH.test(d) && /[Mm]/.test(d);
}

export interface IconLabel {
  anchor: string;
  text: string;
  /** Show a teaser "?" first; the real label is revealed as the drawing finishes. */
  teaser?: boolean;
}

export const MAX_ICON_LABELS = 6;
export const MAX_ICON_LABEL_LENGTH = 40;
