import { describe, expect, it } from 'vitest';
import { buildFollowUpPrompt, buildLessonPrompt, detectSourceLanguage, parseFollowUpRequest, parseLessonAttachment, parseLessonRequest } from './whiteboardLesson';

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
  it('accepts a png board snapshot on follow-ups and ignores other values', () => {
    const base = { question: 'لماذا؟', lang: 'ar', lessonTitle: 't', step: { title: '', narration: 'n', nodes: [] } };
    const png = `data:image/png;base64,${'A'.repeat(100)}`;
    expect(parseFollowUpRequest({ ...base, boardImage: png })?.boardImage).toBe(png);
    expect(parseFollowUpRequest({ ...base, boardImage: 'data:image/jpeg;base64,AAAA' })?.boardImage).toBeUndefined();
    expect(parseFollowUpRequest({ ...base, boardImage: 42 })?.boardImage).toBeUndefined();
    expect(parseFollowUpRequest({ ...base, boardImage: `data:image/png;base64,${'A'.repeat(4_000_001)}` })?.boardImage).toBeUndefined();
    expect(parseFollowUpRequest(base)?.boardImage).toBeUndefined();
    expect(buildFollowUpPrompt(parseFollowUpRequest(base)!)).toContain('أجب عن سؤاله');
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

describe('parseLessonAttachment', () => {
  it('accepts supported files and rejects oversize or unsupported ones', () => {
    const a = parseLessonAttachment({ attachment: { data: 'QUJD', mimeType: 'application/pdf', name: 'درس.pdf' } });
    expect(a).toEqual({ data: 'QUJD', mimeType: 'application/pdf', name: 'درس.pdf' });
    expect(parseLessonAttachment({ attachment: { data: 'x'.repeat(14_000_001), mimeType: 'application/pdf' } })).toBeNull();
    expect(parseLessonAttachment({ attachment: { data: 'QUJD', mimeType: 'application/zip' } })).toBeNull();
    expect(parseLessonAttachment({})).toBeNull();
  });

  it('lets an attachment stand in for the topic', () => {
    expect(parseLessonRequest({ topic: '', attachment: { data: 'QUJD', mimeType: 'text/plain' } })).toMatchObject({ topic: '', lang: 'ar' });
    expect(parseLessonRequest({ topic: '' })).toBeNull();
  });
});

describe('buildLessonPrompt with a source file', () => {
  it('embeds the source text and asks the model to derive the topic', () => {
    const p = buildLessonPrompt({ topic: '', lang: 'ar', steps: 5, sourceText: 'الفصل الأول: الخلية وحدة البناء', sourceName: 'bio.pdf' });
    expect(p).toContain('bio.pdf');
    expect(p).toContain('الفصل الأول: الخلية وحدة البناء');
    expect(p).toContain('استخرج موضوع الدرس');
  });
  it('makes the lesson bilingual when the file language differs from the UI language', () => {
    const ar = buildLessonPrompt({ topic: 'دورة الماء', lang: 'ar', steps: 5, sourceText: 'Evaporation Condensation Precipitation Collection' });
    expect(ar).toContain('قاعدة لغة الدرس (صارمة');
    expect(ar).toContain('ثنائي اللغة بالكامل');
    expect(ar).toContain('اكتب الدرس ثنائي اللغة');
    const en = buildLessonPrompt({ topic: 'الخلية', lang: 'en', steps: 5, sourceText: 'الخلية وحدة البناء الأساسية في الكائنات الحية وتتكون من غشاء وسيتوبلازم ونواة' });
    expect(en).toContain('قاعدة لغة الدرس (صارمة');
    expect(en).toContain('ثنائي اللغة بالكامل');
  });

  it('stays monolingual when the file language matches the UI language or no file is attached', () => {
    const ar = buildLessonPrompt({ topic: 'دورة الماء', lang: 'ar', steps: 5, sourceText: 'الخلية وحدة البناء الأساسية في الكائنات الحية وتتكون من غشاء وسيتوبلازم ونواة' });
    expect(ar).not.toContain('قاعدة لغة الدرس (صارمة');
    expect(ar).toContain('فقط');
    const en = buildLessonPrompt({ topic: 'الخلية', lang: 'en', steps: 5, sourceText: 'Evaporation Condensation Precipitation Collection' });
    expect(en).not.toContain('قاعدة لغة الدرس (صارمة');
    const noFile = buildLessonPrompt({ topic: 'دورة الماء', lang: 'ar', steps: 5 });
    expect(noFile).not.toContain('قاعدة لغة الدرس');
    expect(noFile).toContain('فقط');
  });

  it('detects the source language from its letters', () => {
    expect(detectSourceLanguage('Evaporation Condensation Precipitation Collection')).toBe('en');
    expect(detectSourceLanguage('الخلية وحدة البناء الأساسية في الكائنات الحية وتتكون من غشاء وسيتوبلازم ونواة')).toBe('ar');
    expect(detectSourceLanguage('H2O + CO2 = H2CO3, 3 + 4 = 7')).toBeNull();
  });
});
