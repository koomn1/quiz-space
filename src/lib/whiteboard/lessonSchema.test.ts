import { describe, expect, it } from 'vitest';
import { validateLesson, stripDiacritics } from './lessonSchema';
import { buildTimeline, estimateNarrationMs, nodeProgress, stepIndexAt, visibleChars } from './timeline';

const base = () => ({
  schema_version: 1, id: 'l1', title: 'درس', lang: 'ar',
  steps: [
    { id: 's1', narration: 'مرحبا بكم في الدرس', nodes: [
      { id: 'n1', type: 'text', x: 100, y: 100, text: 'مرحبا', color: 'primary' },
      { id: 'n2', type: 'arrow', x: 100, y: 200, x2: 400, y2: 200, color: 'accent' },
    ] },
    { id: 's2', narration: 'الخطوة الثانية', nodes: [{ id: 'n1', type: 'rectangle', x: 1200, y: 700, w: 500, h: 500, color: 'nope' }] },
  ],
});

describe('validateLesson', () => {
  it('accepts path, curve and icon nodes and validates them strictly', () => {
    const lesson = base() as any;
    lesson.steps[0].nodes = [
      { id: 'p', type: 'path', x: 100, y: 100, d: 'M100 100 C 150 40 200 160 250 100', color: 'accent' },
      { id: 'c', type: 'curve', x: 100, y: 300, cx: 200, cy: 200, x2: 300, y2: 300, color: 'ink' },
      { id: 'i', type: 'icon', x: 500, y: 200, w: 220, h: 220, name: 'heart', color: 'danger', labels: [{ anchor: 'top', text: 'القلب', teaser: true }] },
    ];
    const r = validateLesson(lesson);
    expect(r.ok).toBe(true);
    const icon = r.lesson!.steps[0].nodes[2];
    expect(icon.name).toBe('heart');
    expect(icon.labels![0]).toMatchObject({ anchor: 'top', teaser: true });
  });

  it('rejects unsafe path data, unknown icons and unknown anchors', () => {
    const lesson = base() as any;
    lesson.steps[0].nodes = [
      { id: 'p', type: 'path', x: 1, y: 1, d: 'M0 0; alert(1)', color: 'ink' },
      { id: 'i', type: 'icon', x: 1, y: 1, w: 100, h: 100, name: 'rocket', color: 'ink' },
      { id: 'j', type: 'icon', x: 1, y: 1, w: 100, h: 100, name: 'cell', color: 'ink', labels: [{ anchor: 'nose', text: 'x' }] },
      { id: 'c', type: 'curve', x: 1, y: 1, x2: 9, y2: 9, color: 'ink' },
    ];
    const r = validateLesson(lesson);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/unsupported commands/);
    expect(r.errors.join(' ')).toMatch(/unknown icon/);
    expect(r.errors.join(' ')).toMatch(/unknown anchor/);
    expect(r.errors.join(' ')).toMatch(/control point/);
  });

  it('keeps an explicit per-step language and drops invalid ones', () => {
    const mixed = base() as any;
    mixed.steps[0].lang = 'en';
    mixed.steps[1].lang = 'fr';
    const r = validateLesson(mixed);
    expect(r.ok).toBe(true);
    expect(r.lesson!.steps[0].lang).toBe('en');
    expect(r.lesson!.steps[1].lang).toBeUndefined();
  });

  it('accepts a valid lesson, clamps geometry and keeps it a draft', () => {
    const r = validateLesson(base());
    expect(r.ok).toBe(true);
    const rect = r.lesson!.steps[1].nodes[0];
    expect(rect.x + (rect.w ?? 0)).toBeLessThanOrEqual(1280);
    expect(rect.y + (rect.h ?? 0)).toBeLessThanOrEqual(720);
    expect(rect.color).toBe('ink');
    expect(r.lesson!.metadata.status).toBe('draft');
  });

  it('rejects unknown types, non-finite numbers, duplicates and missing narration', () => {
    const bad = base() as any;
    bad.steps[0].nodes[0].type = 'script';
    bad.steps[0].nodes[1].x = Number.POSITIVE_INFINITY;
    bad.steps[1].id = 's1';
    expect(validateLesson(bad).ok).toBe(false);
    const dupNode = base() as any;
    dupNode.steps[0].nodes[1].id = 'n1';
    expect(validateLesson(dupNode).errors.join(' ')).toMatch(/duplicate node/);
    const noNarr = base() as any;
    noNarr.steps[0].narration = '  ';
    expect(validateLesson(noNarr).ok).toBe(false);
  });

  it('rejects wrong versions, empty steps and non-objects, and never trusts a reviewed flag from outside as published', () => {
    expect(validateLesson(null).ok).toBe(false);
    expect(validateLesson({ ...base(), schema_version: 2 }).ok).toBe(false);
    expect(validateLesson({ ...base(), steps: [] }).ok).toBe(false);
    const r = validateLesson({ ...base(), metadata: { source: 'ai', status: 'published' } });
    expect(r.lesson!.metadata).toMatchObject({ source: 'ai', status: 'draft' });
  });

  it('strips control characters and limits text length', () => {
    const l = base() as any;
    l.steps[0].nodes[0].text = 'a\u0000b' + 'x'.repeat(500);
    const r = validateLesson(l);
    expect(r.lesson!.steps[0].nodes[0].text!.length).toBe(200);
    expect(r.lesson!.steps[0].nodes[0].text).not.toContain('\u0000');
  });
});

describe('timeline', () => {
  it('builds contiguous step timings and finds the step at a time', () => {
    const lesson = validateLesson(base()).lesson!;
    const tl = buildTimeline(lesson);
    expect(tl.steps[1].startMs).toBe(tl.steps[0].durationMs);
    expect(stepIndexAt(tl, 0)).toBe(0);
    expect(stepIndexAt(tl, tl.totalMs - 1)).toBe(1);
    expect(estimateNarrationMs('كلمة', 1)).toBeGreaterThanOrEqual(2500);
    expect(estimateNarrationMs('a b c d e f g h i j k l m n o p', 2)).toBeLessThan(estimateNarrationMs('a b c d e f g h i j k l m n o p', 1));
  });

  it('draws nodes in order and reveals text gradually', () => {
    const lesson = validateLesson(base()).lesson!;
    const step = lesson.steps[0];
    const d = buildTimeline(lesson).steps[0].durationMs;
    expect(nodeProgress(step, 0, 0, d)).toBe(0);
    expect(nodeProgress(step, 1, 10, d)).toBe(0);
    expect(nodeProgress(step, 0, d, d)).toBe(1);
    expect(visibleChars(step.nodes[0], 0.5)).toBe(3);
    expect(visibleChars(step.nodes[0], 1)).toBe(5);
  });
});

import { SAMPLE_LESSONS } from './sampleLessons';
describe('sample lessons', () => {
  it('are valid, reviewed and have narration for every step', () => {
    for (const l of SAMPLE_LESSONS) {
      expect(validateLesson(l).ok).toBe(true);
      expect(l.metadata.status).toBe('reviewed');
      l.steps.forEach(s => expect(s.narration.length).toBeGreaterThan(10));
    }
  });
});

describe('stripDiacritics', () => {
  it('removes tashkeel and tatweel but keeps the letters', () => {
    expect(stripDiacritics('الشَّمْسُ مِـرْكَزُ النِّظَامِ')).toBe('الشمس مركز النظام');
    expect(stripDiacritics('مُرِّكَبٌ عُضْوِيٌّ')).toBe('مركب عضوي');
  });

  it('strips diacritics from board texts but keeps them in narration', () => {
    const lesson = base() as any;
    lesson.title = 'النِّظَامُ الشَّمْسِيُّ';
    lesson.steps[0].title = 'تَعْرِيفٌ';
    lesson.steps[0].narration = 'الشَّمْسُ نَجْمٌ فِي مَرْكَزِ النِّظَامِ.';
    lesson.steps[0].tryIt = 'ارْسِمِ الشَّمْسَ بِنَفْسِكَ';
    lesson.steps[0].nodes = [{ id: 'n1', type: 'text', x: 100, y: 100, text: 'الشَّمْسُ نَجْمٌ', color: 'primary' }];
    const r = validateLesson(lesson);
    expect(r.ok).toBe(true);
    expect(r.lesson!.title).toBe('النظام الشمسي');
    expect(r.lesson!.steps[0].title).toBe('تعريف');
    expect(r.lesson!.steps[0].tryIt).toBe('ارسم الشمس بنفسك');
    expect(r.lesson!.steps[0].nodes[0].text).toBe('الشمس نجم');
    expect(r.lesson!.steps[0].narration).toBe('الشَّمْسُ نَجْمٌ فِي مَرْكَزِ النِّظَامِ.');
  });
});
