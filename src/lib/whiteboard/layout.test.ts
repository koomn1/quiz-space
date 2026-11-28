import { describe, expect, it } from 'vitest';
import { layoutLesson, textBox } from './layout';
import { validateAiLesson } from './lessonDrafts';
import { SAMPLE_LESSONS } from './sampleLessons';
import { canGenerateWhiteboardLesson } from './access';

const lesson = (nodes: object[], lang = 'ar') => ({ schema_version: 1, id: 'l', title: 'T', lang, steps: [{ id: 's1', narration: 'شرح', nodes }] });
const t = (id: string, x: number, y: number, text: string, extra: object = {}) => ({ id, type: 'text', x, y, text, fontSize: 40, color: 'ink', align: 'center', ...extra });

describe('whiteboard layout checker', () => {
  it('keeps every built-in sample lesson free of problems', () => {
    for (const s of SAMPLE_LESSONS) expect(layoutLesson(s).problems).toEqual([]);
  });
  it('nudges overlapping text apart', () => {
    const r = validateAiLesson(lesson([t('a', 640, 300, 'السطر الأول من الشرح'), t('b', 640, 310, 'السطر الثاني من الشرح')]));
    expect(r.ok).toBe(true);
    const [a, b] = r.lesson!.steps[0].nodes;
    expect(b.y).toBeGreaterThan(a.y + 30);
    expect(r.warnings.some(w => w.includes('overlap'))).toBe(true);
  });
  it('removes an arrow that crosses text and rejects text running over a frame edge', () => {
    const arrow = { id: 'ar', type: 'arrow', x: 300, y: 300, x2: 900, y2: 300, color: 'ink' };
    const r = validateAiLesson(lesson([t('a', 640, 310, 'نص في الطريق'), arrow]));
    expect(r.ok).toBe(true);
    expect(r.lesson!.steps[0].nodes.some(n => n.type === 'arrow')).toBe(false);
    const box = { id: 'b', type: 'rectangle', x: 700, y: 200, w: 200, h: 300, color: 'ink' };
    const bad = validateAiLesson(lesson([box, t('c', 640, 350, 'نص طويل يعبر حافة الإطار تماما', { align: 'center' })]));
    expect(bad.ok).toBe(false);
  });
  it('shrinks text that would clip and keeps it inside the board', () => {
    const r = validateAiLesson(lesson([t('a', 1200, 300, 'نص طويل جدا جدا جدا جدا جدا يتجاوز عرض السبورة بكثير', { align: 'start', fontSize: 60 })]));
    expect(r.ok).toBe(true);
    const box = textBox(r.lesson!.steps[0].nodes[0], true);
    expect(box.x0).toBeGreaterThanOrEqual(0);
    expect(box.x1).toBeLessThanOrEqual(1280);
  });
  it('rejects lessons that cannot be separated', () => {
    const nodes = Array.from({ length: 9 }, (_, i) => t(`n${i}`, 640, 640, `سطر رقم ${i} طويل نوعا ما`, { fontSize: 60 }));
    const r = validateAiLesson(lesson(nodes));
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it('flags free text that straddles a shape edge but allows labels inside it', () => {
    const shape = { id: 'r', type: 'rectangle', x: 400, y: 300, w: 300, h: 100, color: 'ink' };
    expect(validateAiLesson(lesson([shape, t('a', 550, 360, 'داخل', { fontSize: 30 })])).ok).toBe(true);
    expect(validateAiLesson(lesson([shape, t('b', 760, 360, 'نص يعبر الحافة عبر', { fontSize: 40 })])).ok).toBe(false);
  });
});

describe('whiteboard AI access', () => {
  it('allows only gold and diamond plans', () => {
    expect(canGenerateWhiteboardLesson(true, 'Gold')).toBe(true);
    expect(canGenerateWhiteboardLesson(true, 'الباقة الماسية')).toBe(true);
    expect(canGenerateWhiteboardLesson(true, 'Silver')).toBe(false);
    expect(canGenerateWhiteboardLesson(false, 'Diamond')).toBe(false);
    expect(canGenerateWhiteboardLesson(undefined, undefined)).toBe(false);
  });
});

import { validateBranchStep } from './lessonDrafts';
import { validateLesson } from './lessonSchema';

describe('branch steps (learner questions)', () => {
  const base = validateLesson(lesson([t('title', 640, 90, 'عنوان الدرس'), t('a', 640, 300, 'الفكرة الأساسية هنا', { fontSize: 44 })])).lesson!;
  const branch = (nodes: object[]) => ({ id: 'q1', title: 'إجابتك', narration: 'شرح السؤال', nodes });

  it('adds a continuing branch that keeps the board and avoids existing text', () => {
    const r = validateBranchStep(branch([t('n1', 640, 305, 'نص جديد فوق القديم', { fontSize: 44 }), t('n2', 640, 520, 'مثال جديد')]), base, 0);
    expect(r.ok).toBe(true);
    expect(r.step).toMatchObject({ continues: true, branch: true });
    expect(r.step!.id).toMatch(/^q-/);
    const moved = r.step!.nodes[0];
    expect(moved.y).toBeGreaterThan(330);
  });
  it('rejects unsafe or broken branch output with the same validator', () => {
    expect(validateBranchStep({ id: 'x', narration: 'a', nodes: [{ id: 'n', type: 'iframe', x: 1, y: 1 }] }, base, 0).ok).toBe(false);
    expect(validateBranchStep('nope', base, 0).ok).toBe(false);
  });
  it('answers on a fresh board when the carried board has no room left', () => {
    // A nearly full board: stacked big texts from top to bottom.
    const full = validateLesson(lesson([
      t('h', 640, 30, 'عنوان الدرس المكتوب بالكامل هنا', { fontSize: 44 }),
      t('a', 640, 115, 'السطر الأول من الشرح الطويل نسبيًا', { fontSize: 44 }),
      t('b', 640, 200, 'السطر الثاني من الشرح الطويل نسبيًا', { fontSize: 44 }),
      t('c', 640, 285, 'السطر الثالث من الشرح الطويل نسبيًا', { fontSize: 44 }),
      t('d', 640, 370, 'السطر الرابع من الشرح الطويل نسبيًا', { fontSize: 44 }),
      t('e', 640, 455, 'السطر الخامس من الشرح الطويل نسبيًا', { fontSize: 44 }),
      t('f', 640, 540, 'السطر السادس من الشرح الطويل نسبيًا', { fontSize: 44 }),
      t('g', 640, 625, 'السطر السابع من الشرح الطويل نسبيًا', { fontSize: 44 }),
    ])).lesson!;
    const r = validateBranchStep(branch([
      t('n1', 640, 100, 'إجابة السؤال سطر أول', { fontSize: 36 }),
      t('n2', 640, 300, 'إجابة السؤال سطر ثان', { fontSize: 36 }),
    ]), full, 0);
    expect(r.ok).toBe(true);
    expect(r.step!.continues).toBeFalsy();
    expect(r.warnings.some(w => w.includes('fresh board'))).toBe(true);
  });
});
