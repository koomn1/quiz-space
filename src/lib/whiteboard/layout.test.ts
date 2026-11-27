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
