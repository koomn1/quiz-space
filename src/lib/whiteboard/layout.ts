import { CANVAS_HEIGHT, CANVAS_WIDTH, type LessonStep, type WhiteboardLesson, type WhiteboardNode } from './lessonSchema';

/**
 * Layout checker for AI lessons. The model cannot measure text, so we estimate each text box,
 * repair what is repairable (shrink to fit, nudge to a free slot) and report what is not.
 */
export const SAFE = { left: 24, right: CANVAS_WIDTH - 24, top: 24, bottom: CANVAS_HEIGHT - 20 } as const;
const MIN_TEXT_SIZE = 22;
const GAP = 10;

export interface Box { x0: number; y0: number; x1: number; y1: number }

const AR = /[\u0600-\u06FF]/;
/** Rough advance width per character in em for the board font (bold). Slightly generous so we never under-estimate. */
export function textWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += 0.28;
    else if (AR.test(ch)) em += 0.52;
    else if (/[0-9]/.test(ch)) em += 0.6;
    else if (/[A-Z]/.test(ch)) em += 0.68;
    else if (/[a-z]/.test(ch)) em += 0.56;
    else em += 0.6;
  }
  return em * fontSize;
}

export function textBox(node: WhiteboardNode, rtl: boolean): Box {
  const size = node.fontSize ?? 32;
  const w = textWidth(node.text ?? '', size);
  const align = node.align ?? 'start';
  const left = align === 'center' ? node.x - w / 2 : (align === 'start') === rtl ? node.x - w : node.x;
  return { x0: left, x1: left + w, y0: node.y - size * 0.95, y1: node.y + size * 0.3 };
}

const intersects = (a: Box, b: Box, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
const contains = (outer: Box, inner: Box) => inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1;
const shapeBox = (n: WhiteboardNode): Box => ({ x0: n.x, y0: n.y, x1: n.x + (n.w ?? 0), y1: n.y + (n.h ?? 0) });

/** Text drawn inside a rectangle/ellipse is centred in the shape by the player. */
export function shapeTextBox(node: WhiteboardNode): Box | null {
  if (!node.text) return null;
  const size = node.fontSize ?? 32;
  const w = textWidth(node.text, size);
  const cx = node.x + (node.w ?? 0) / 2;
  const cy = node.y + (node.h ?? 0) / 2 + size / 3;
  return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - size * 0.95, y1: cy + size * 0.3 };
}

function fitInto(node: WhiteboardNode, rtl: boolean) {
  if (node.type !== 'text') return;
  let size = node.fontSize ?? 32;
  let box = textBox(node, rtl);
  while ((box.x0 < SAFE.left || box.x1 > SAFE.right) && size > MIN_TEXT_SIZE) {
    size -= 2;
    node.fontSize = size;
    box = textBox(node, rtl);
  }
  // Still wider than the board after shrinking: pull the anchor inward as far as it can go.
  if (box.x0 < SAFE.left) { node.x += SAFE.left - box.x0; box = textBox(node, rtl); }
  if (box.x1 > SAFE.right) { node.x -= box.x1 - SAFE.right; box = textBox(node, rtl); }
  if (box.y0 < SAFE.top) node.y += SAFE.top - box.y0;
  if (box.y1 > SAFE.bottom) node.y -= box.y1 - SAFE.bottom;
}

export interface LayoutReport {
  lesson: WhiteboardLesson;
  /** Things we repaired automatically. */
  fixes: string[];
  /** Problems that remain after repair; the lesson should not be shown as-is when this is non-empty. */
  problems: string[];
}

function layoutStep(step: LessonStep, si: number, rtl: boolean, fixes: string[], problems: string[]): LessonStep {
  const nodes: WhiteboardNode[] = step.nodes.map(n => ({ ...n }));
  const where = `step ${si + 1}`;
  // 1) Keep every text inside the board.
  nodes.forEach((n, i) => {
    if (n.type !== 'text') return;
    const before = JSON.stringify([n.x, n.y, n.fontSize]);
    fitInto(n, rtl);
    if (JSON.stringify([n.x, n.y, n.fontSize]) !== before) fixes.push(`${where}, text ${i + 1}: moved or resized to stay inside the board.`);
  });
  // 2) Shape labels must fit their shape.
  nodes.forEach((n, i) => {
    if ((n.type !== 'rectangle' && n.type !== 'ellipse') || !n.text) return;
    let size = n.fontSize ?? 32;
    const maxW = (n.w ?? 0) * (n.type === 'ellipse' ? 0.7 : 0.9);
    while (textWidth(n.text, size) > maxW && size > MIN_TEXT_SIZE) size -= 2;
    if (size !== (n.fontSize ?? 32)) { n.fontSize = size; fixes.push(`${where}, shape ${i + 1}: label shrunk to fit.`); }
    if (textWidth(n.text, size) > maxW) problems.push(`${where}, shape ${i + 1}: label does not fit its shape.`);
  });
  // 3) Resolve text-vs-text overlaps by nudging later text down, then check what is left.
  const placed: Box[] = [];
  nodes.forEach((n, i) => {
    const box = n.type === 'text' ? textBox(n, rtl) : shapeTextBox(n);
    if (!box) return;
    let moved = 0;
    let guard = 0;
    while (placed.some(p => intersects(box, p, GAP)) && guard++ < 30) {
      const dy = 16;
      n.y += dy; box.y0 += dy; box.y1 += dy; moved += dy;
      if (box.y1 > SAFE.bottom) break;
    }
    if (moved && !placed.some(p => intersects(box, p, 0)) && box.y1 <= SAFE.bottom) fixes.push(`${where}, item ${i + 1}: moved down ${moved}px to avoid overlap.`);
    else if (placed.some(p => intersects(box, p, 0)) || box.y1 > SAFE.bottom) problems.push(`${where}, item ${i + 1}: overlaps other text.`);
    placed.push(box);
  });
  // 4) Free text must not sit half on top of a shape (fully inside a shape is fine, that is a label).
  nodes.forEach((n, i) => {
    if (n.type !== 'text') return;
    const tb = textBox(n, rtl);
    nodes.forEach((s, j) => {
      if (s.type !== 'rectangle' && s.type !== 'ellipse') return;
      const sb = shapeBox(s);
      const cx = (tb.x0 + tb.x1) / 2; const cy = (tb.y0 + tb.y1) / 2;
      const centreInside = cx >= sb.x0 && cx <= sb.x1 && cy >= sb.y0 && cy <= sb.y1;
      // Text centred in a shape is a label or a circled answer; text whose centre is outside but overlaps the edge is a collision.
      if (intersects(tb, sb, 0) && !contains(sb, tb) && !centreInside) problems.push(`${where}, text ${i + 1} crosses shape ${j + 1}.`);
    });
  });
  return { ...step, nodes };
}

export function layoutLesson(lesson: WhiteboardLesson): LayoutReport {
  const fixes: string[] = [];
  const problems: string[] = [];
  const rtl = lesson.lang === 'ar';
  const steps = lesson.steps.map((s, i) => layoutStep(s, i, rtl, fixes, problems));
  return { lesson: { ...lesson, steps }, fixes, problems };
}
