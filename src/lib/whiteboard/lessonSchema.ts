/**
 * Whiteboard lesson contract (schema_version 1).
 * Logical coordinates on a fixed 1280x720 canvas; never physical pixels.
 * The scene graph is the source of truth; the player only renders it.
 */
export const LESSON_SCHEMA_VERSION = 1 as const;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const NODE_TYPES = ['text', 'rectangle', 'ellipse', 'line', 'arrow', 'highlight', 'path', 'curve', 'icon', 'sticker'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const NODE_COLORS = ['ink', 'primary', 'accent', 'success', 'danger', 'muted'] as const;
export type NodeColor = (typeof NODE_COLORS)[number];

export const LIMITS = {
  maxSteps: 30,
  maxNodesPerStep: 24,
  maxTextLength: 200,
  maxNarrationLength: 700,
  maxTitleLength: 120,
  minFontSize: 14,
  maxFontSize: 96,
} as const;

export interface WhiteboardNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  /** Width/height for rectangle, ellipse, highlight. */
  w?: number;
  h?: number;
  /** End point for line, arrow and curve. */
  x2?: number;
  y2?: number;
  /** Control point for curve (quadratic bezier). */
  cx?: number;
  cy?: number;
  /** Raw SVG path data for path nodes, in board coordinates. */
  d?: string;
  /** Illustration name for icon nodes; sticker id from the sticker catalog for sticker nodes. */
  name?: string;
  /** Labels pinned to an icon's named anchors. */
  labels?: { anchor: string; text: string; teaser?: boolean }[];
  text?: string;
  fontSize?: number;
  color: NodeColor;
  align?: 'start' | 'center' | 'end';
}

export interface LessonStep {
  id: string;
  title?: string;
  narration: string;
  nodes: WhiteboardNode[];
  /** Step language; omit to use the lesson language. Mixed lessons set it per step. */
  lang?: 'ar' | 'en';
  /** Keep the previous step's drawing on the board and draw this step's nodes in the free space. */
  continues?: boolean;
  /** Inserted in answer to a learner question; after it the player offers to resume the original lesson. */
  branch?: boolean;
  /** Try-it-yourself prompt: in try mode the player pauses before revealing this step so the learner can attempt it on the draw layer. */
  tryIt?: string;
}

export interface WhiteboardLesson {
  schema_version: typeof LESSON_SCHEMA_VERSION;
  id: string;
  title: string;
  lang: 'ar' | 'en';
  canvas: { width: number; height: number };
  steps: LessonStep[];
  metadata: {
    source: 'sample' | 'ai' | 'manual';
    status: 'draft' | 'reviewed';
    createdAt?: string;
    model?: string;
  };
}

export interface ValidationResult {
  ok: boolean;
  lesson?: WhiteboardLesson;
  errors: string[];
  warnings: string[];
}

import { ICON_NAMES, ICONS, isSafePathData, MAX_ICON_LABEL_LENGTH, MAX_ICON_LABELS, type IconName } from './icons';
import { stickerSet } from './stickers';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const cleanText = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '';

const SHAPES_WITH_BOX: NodeType[] = ['rectangle', 'ellipse', 'highlight'];

/**
 * Validates untrusted JSON (for example model output) and returns a sanitized lesson.
 * Structural problems are errors (the lesson is rejected); out-of-range numbers are clamped with a warning.
 */
export function validateLesson(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['Lesson must be an object.'], warnings };

  if (input.schema_version !== LESSON_SCHEMA_VERSION) errors.push(`Unsupported schema_version (expected ${LESSON_SCHEMA_VERSION}).`);
  const title = cleanText(input.title, LIMITS.maxTitleLength);
  if (!title) errors.push('Lesson title is required.');
  const lang = input.lang === 'en' ? 'en' : input.lang === 'ar' ? 'ar' : null;
  if (!lang) errors.push('lang must be "ar" or "en".');
  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    errors.push('Lesson needs at least one step.');
    return { ok: false, errors, warnings };
  }
  if (input.steps.length > LIMITS.maxSteps) errors.push(`Too many steps (max ${LIMITS.maxSteps}).`);

  const steps: LessonStep[] = [];
  const stepIds = new Set<string>();
  input.steps.slice(0, LIMITS.maxSteps).forEach((rawStep, si) => {
    const where = `step ${si + 1}`;
    if (!isRecord(rawStep)) { errors.push(`${where}: must be an object.`); return; }
    const id = cleanText(rawStep.id, 64) || `s${si + 1}`;
    if (stepIds.has(id)) { errors.push(`${where}: duplicate step id "${id}".`); return; }
    stepIds.add(id);
    const narration = cleanText(rawStep.narration, LIMITS.maxNarrationLength);
    if (!narration) errors.push(`${where}: narration is required.`);
    if (typeof rawStep.narration === 'string' && rawStep.narration.length > LIMITS.maxNarrationLength) warnings.push(`${where}: narration was shortened.`);
    if (!Array.isArray(rawStep.nodes)) { errors.push(`${where}: nodes must be an array.`); return; }
    if (rawStep.nodes.length > LIMITS.maxNodesPerStep) warnings.push(`${where}: only the first ${LIMITS.maxNodesPerStep} nodes are kept.`);

    const nodes: WhiteboardNode[] = [];
    const nodeIds = new Set<string>();
    rawStep.nodes.slice(0, LIMITS.maxNodesPerStep).forEach((rawNode, ni) => {
      const nw = `${where}, node ${ni + 1}`;
      if (!isRecord(rawNode)) { errors.push(`${nw}: must be an object.`); return; }
      const type = rawNode.type as NodeType;
      if (!NODE_TYPES.includes(type)) { errors.push(`${nw}: unknown node type.`); return; }
      const nid = cleanText(rawNode.id, 64) || `${id}-n${ni + 1}`;
      if (nodeIds.has(nid)) { errors.push(`${nw}: duplicate node id "${nid}".`); return; }
      nodeIds.add(nid);
      if (!finite(rawNode.x) || !finite(rawNode.y)) { errors.push(`${nw}: x and y must be finite numbers.`); return; }
      const node: WhiteboardNode = {
        id: nid,
        type,
        x: clamp(rawNode.x, 0, CANVAS_WIDTH),
        y: clamp(rawNode.y, 0, CANVAS_HEIGHT),
        color: NODE_COLORS.includes(rawNode.color as NodeColor) ? (rawNode.color as NodeColor) : 'ink',
      };
      if (node.x !== rawNode.x || node.y !== rawNode.y) warnings.push(`${nw}: position moved inside the board.`);

      if (SHAPES_WITH_BOX.includes(type)) {
        if (!finite(rawNode.w) || !finite(rawNode.h) || rawNode.w <= 0 || rawNode.h <= 0) { errors.push(`${nw}: w and h must be positive numbers.`); return; }
        node.w = clamp(rawNode.w, 8, CANVAS_WIDTH - node.x);
        node.h = clamp(rawNode.h, 8, CANVAS_HEIGHT - node.y);
      }
      if (type === 'line' || type === 'arrow') {
        if (!finite(rawNode.x2) || !finite(rawNode.y2)) { errors.push(`${nw}: x2 and y2 are required.`); return; }
        node.x2 = clamp(rawNode.x2, 0, CANVAS_WIDTH);
        node.y2 = clamp(rawNode.y2, 0, CANVAS_HEIGHT);
        if (node.x === node.x2 && node.y === node.y2) { errors.push(`${nw}: zero-length line.`); return; }
      }
      if (type === 'curve') {
        if (!finite(rawNode.x2) || !finite(rawNode.y2) || !finite(rawNode.cx) || !finite(rawNode.cy)) { errors.push(`${nw}: a curve needs x2, y2 and a control point cx, cy.`); return; }
        node.x2 = clamp(rawNode.x2, 0, CANVAS_WIDTH);
        node.y2 = clamp(rawNode.y2, 0, CANVAS_HEIGHT);
        node.cx = clamp(rawNode.cx, 0, CANVAS_WIDTH);
        node.cy = clamp(rawNode.cy, 0, CANVAS_HEIGHT);
      }
      if (type === 'path') {
        if (!isSafePathData(rawNode.d)) { errors.push(`${nw}: path data missing or uses unsupported commands.`); return; }
        node.d = rawNode.d.trim();
      }
      if (type === 'icon') {
        const name = rawNode.name as IconName;
        if (!ICON_NAMES.includes(name)) { errors.push(`${nw}: unknown icon (allowed: ${ICON_NAMES.join(', ')}).`); return; }
        node.name = name;
        if (!finite(rawNode.w) || !finite(rawNode.h) || rawNode.w <= 0 || rawNode.h <= 0) { errors.push(`${nw}: w and h must be positive numbers.`); return; }
        node.w = clamp(rawNode.w, 24, CANVAS_WIDTH - node.x);
        node.h = clamp(rawNode.h, 24, CANVAS_HEIGHT - node.y);
        const anchors = ICONS[name].anchors;
        const labels = Array.isArray(rawNode.labels) ? rawNode.labels.slice(0, MAX_ICON_LABELS) : [];
        node.labels = [];
        labels.forEach((rawLabel, li) => {
          if (!isRecord(rawLabel)) return;
          const anchor = typeof rawLabel.anchor === 'string' ? rawLabel.anchor : '';
          if (!anchors[anchor]) { errors.push(`${nw}, label ${li + 1}: unknown anchor "${anchor}" (has: ${Object.keys(anchors).join(', ')}).`); return; }
          const text = cleanText(rawLabel.text, MAX_ICON_LABEL_LENGTH);
          if (!text) { errors.push(`${nw}, label ${li + 1}: text is required.`); return; }
          node.labels!.push({ anchor, text, ...(rawLabel.teaser === true ? { teaser: true } : {}) });
        });
      }
      if (type === 'sticker') {
        const name = typeof rawNode.name === 'string' ? rawNode.name : '';
        if (!stickerSet.has(name)) { errors.push(`${nw}: unknown sticker "${name.slice(0, 60)}".`); return; }
        node.name = name;
        if (!finite(rawNode.w) || !finite(rawNode.h) || rawNode.w <= 0 || rawNode.h <= 0) { errors.push(`${nw}: w and h must be positive numbers.`); return; }
        node.w = clamp(rawNode.w, 24, Math.min(400, CANVAS_WIDTH - node.x));
        node.h = clamp(rawNode.h, 24, Math.min(400, CANVAS_HEIGHT - node.y));
      }
      if (type === 'text' || type === 'rectangle' || type === 'ellipse') {
        const text = cleanText(rawNode.text, LIMITS.maxTextLength);
        if (type === 'text' && !text) { errors.push(`${nw}: text node needs text.`); return; }
        if (text) node.text = text;
        if (type === 'text' || text) {
          node.fontSize = clamp(finite(rawNode.fontSize) ? rawNode.fontSize : 32, LIMITS.minFontSize, LIMITS.maxFontSize);
        }
        if (rawNode.align === 'start' || rawNode.align === 'center' || rawNode.align === 'end') node.align = rawNode.align;
      }
      nodes.push(node);
    });
    steps.push({
      id, title: cleanText(rawStep.title, LIMITS.maxTitleLength) || undefined, narration, nodes,
      ...(rawStep.lang === 'ar' || rawStep.lang === 'en' ? { lang: rawStep.lang } : {}),
      ...(rawStep.continues === true ? { continues: true } : {}),
      ...(rawStep.branch === true ? { branch: true } : {}),
      ...(typeof rawStep.tryIt === 'string' && rawStep.tryIt.trim() ? { tryIt: cleanText(rawStep.tryIt, 300) } : {}),
    });
  });

  if (errors.length > 0 || !lang) return { ok: false, errors, warnings };

  const meta = isRecord(input.metadata) ? input.metadata : {};
  const lesson: WhiteboardLesson = {
    schema_version: LESSON_SCHEMA_VERSION,
    id: cleanText(input.id, 64) || `lesson-${Date.now().toString(36)}`,
    title,
    lang,
    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    steps,
    metadata: {
      source: meta.source === 'ai' || meta.source === 'manual' ? meta.source : 'sample',
      // Anything that passes through validation without an explicit human review stays a draft.
      status: meta.status === 'reviewed' ? 'reviewed' : 'draft',
      createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : undefined,
      model: typeof meta.model === 'string' ? cleanText(meta.model, 80) : undefined,
    },
  };
  return { ok: true, lesson, errors, warnings };
}
