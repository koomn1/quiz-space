import { describe, expect, it } from 'vitest';
import { buildLessonPrompt, parseLessonRequest } from './whiteboardLesson';

describe('whiteboard lesson request', () => {
  it('accepts a normal topic and clamps the step count', () => {
    expect(parseLessonRequest({ topic: '  دورة   الماء ', steps: 50 })).toEqual({ topic: 'دورة الماء', lang: 'ar', steps: 8 });
    expect(parseLessonRequest({ topic: 'Photosynthesis', lang: 'en' })).toEqual({ topic: 'Photosynthesis', lang: 'en', steps: 5 });
  });
  it('rejects empty, short, non-string and oversized topics', () => {
    expect(parseLessonRequest(null)).toBeNull();
    expect(parseLessonRequest({ topic: 12 })).toBeNull();
    expect(parseLessonRequest({ topic: 'ab' })).toBeNull();
    expect(parseLessonRequest({ topic: 'x'.repeat(401) })).toBeNull();
  });
  it('builds a prompt with the schema and board limits', () => {
    const p = buildLessonPrompt({ topic: 'الكسور', lang: 'ar', steps: 5 });
    expect(p).toContain('1280');
    expect(p).toContain('schema_version');
    expect(p).toContain('5 بالضبط');
  });
  it('passes validation feedback through to the prompt', () => {
    const req = parseLessonRequest({ topic: 'الخلايا', feedback: ['step 2, text 4 runs over the edge of shape 3.', 42, '   '] });
    expect(req?.feedback).toEqual(['step 2, text 4 runs over the edge of shape 3.']);
    const p = buildLessonPrompt(req!);
    expect(p).toContain('محاولة سابقة');
    expect(p).toContain('runs over the edge');
    expect(buildLessonPrompt({ topic: 'الخلايا', lang: 'ar', steps: 5 })).not.toContain('محاولة سابقة');
  });
});
