import type { LessonStep, WhiteboardLesson, WhiteboardNode } from './lessonSchema';

export const MIN_STEP_MS = 2500;
const MS_PER_WORD = 420; // calm pace for Arabic narration at rate 1

export function estimateNarrationMs(text: string, rate = 1) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_STEP_MS, Math.round((words * MS_PER_WORD) / Math.max(0.5, rate)));
}

export interface StepTiming {
  stepIndex: number;
  startMs: number;
  durationMs: number;
}

export interface Timeline {
  steps: StepTiming[];
  totalMs: number;
}

/** Pure drawing time a step needs so every node can be drawn without rushing. */
export function minDrawMs(step: LessonStep) {
  return 600 + step.nodes.length * 650;
}

export function stepDurationMs(step: LessonStep, rate = 1) {
  return Math.max(estimateNarrationMs(step.narration, rate), minDrawMs(step));
}

export function buildTimeline(lesson: WhiteboardLesson, rate = 1): Timeline {
  let cursor = 0;
  const steps = lesson.steps.map((step, stepIndex) => {
    const durationMs = stepDurationMs(step, rate);
    const timing = { stepIndex, startMs: cursor, durationMs };
    cursor += durationMs;
    return timing;
  });
  return { steps, totalMs: cursor };
}

export function stepIndexAt(timeline: Timeline, tMs: number) {
  if (timeline.steps.length === 0) return 0;
  const t = Math.max(0, tMs);
  for (let i = timeline.steps.length - 1; i >= 0; i--) {
    if (t >= timeline.steps[i].startMs) return i;
  }
  return 0;
}

/** Nodes are drawn one after another across the first ~80% of the step. */
export function nodeProgress(step: LessonStep, nodeIndex: number, tInStepMs: number, durationMs: number) {
  const n = step.nodes.length;
  if (n === 0) return 0;
  const window = durationMs * 0.8;
  const slot = window / n;
  const start = slot * nodeIndex;
  const drawMs = Math.min(1600, Math.max(500, slot * 1.1));
  return Math.min(1, Math.max(0, (tInStepMs - start) / drawMs));
}

export function visibleChars(node: WhiteboardNode, progress: number) {
  const len = node.text?.length ?? 0;
  return Math.ceil(len * Math.min(1, Math.max(0, progress)));
}
