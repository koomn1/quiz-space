import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildVisionChunkRanges, deriveQuizTitle, isGenericQuizTitle, selectVisionChunkPlan, sourceFileBaseName, validateCreateExtractionJobInput, visionChunkRetryDelaySeconds } from './extractionJobs';

const extractionSource = readFileSync(new URL('./extractionJobs.ts', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

describe('dynamic vision chunk planning', () => {
  it('keeps the default five-page split for a normal scanned document', () => {
    const plan = selectVisionChunkPlan(9, 9 * 220 * 1024);
    expect(plan.pageCountPerChunk).toBe(5);
    expect(plan.concurrency).toBe(3);
    expect(plan.estimatedChunkCount).toBe(2);
    expect(buildVisionChunkRanges(9, plan.pageCountPerChunk)).toEqual([
      { chunkIndex: 0, pageStart: 1, pageEnd: 5 },
      { chunkIndex: 1, pageStart: 6, pageEnd: 9 },
    ]);
  });

  it('reduces payload size for a large document while raising safe queue parallelism', () => {
    const plan = selectVisionChunkPlan(50, 50 * 500 * 1024);
    expect(plan.pageCountPerChunk).toBe(4);
    expect(plan.concurrency).toBe(4);
    expect(plan.estimatedChunkCount).toBe(13);
    const ranges = buildVisionChunkRanges(50, plan.pageCountPerChunk);
    expect(ranges.at(-1)).toEqual({ chunkIndex: 12, pageStart: 49, pageEnd: 50 });
  });

  it('uses the smallest payload for very heavy raster pages', () => {
    const plan = selectVisionChunkPlan(80, 80 * 900 * 1024);
    expect(plan.pageCountPerChunk).toBe(3);
    expect(plan.concurrency).toBe(3);
    expect(plan.reason).toBe('raster-heavy');
    expect(plan.estimatedChunkCount).toBe(27);
  });

  it('rejects invalid ranges instead of creating malformed queue chunks', () => {
    expect(buildVisionChunkRanges(0)).toEqual([]);
    expect(buildVisionChunkRanges(10, 2)).toEqual([]);
    expect(buildVisionChunkRanges(10, 6)).toEqual([]);
  });

  it('uses bounded exponential queue retry delays for failed chunks', () => {
    expect(visionChunkRetryDelaySeconds(0)).toBe(10);
    expect(visionChunkRetryDelaySeconds(1)).toBe(10);
    expect(visionChunkRetryDelaySeconds(2)).toBe(20);
    expect(visionChunkRetryDelaySeconds(3)).toBe(40);
    expect(visionChunkRetryDelaySeconds(10)).toBe(60);
  });

  it('accepts supported animated and modern image MIME types', () => {
    const base = {
      idempotencyKey: 'media-test-key-123456',
      fileStoragePath: '00000000-0000-4000-8000-000000000001/uploads/source.gif',
      extractionMode: 'literal' as const,
      requestedQuestionCount: 1,
    };
    expect(validateCreateExtractionJobInput({ ...base, mimeType: 'image/gif' }, '00000000-0000-4000-8000-000000000001')).toBeNull();
    expect(validateCreateExtractionJobInput({ ...base, mimeType: 'image/avif' }, '00000000-0000-4000-8000-000000000001')).toBeNull();
  });

  it('keeps answer accuracy strict instead of silently defaulting to option zero', () => {
    expect(extractionSource).toContain('If the source has no answer key, use null and do not guess.');
    expect(extractionSource).toContain('لا تستخدم correctIndex=-1 أو إجابة فارغة للأسئلة الموضوعية');
    expect(extractionSource).toContain('correctIndex: type === \'essay\' ? -1 : resolveCorrectIndex(raw, options, type)');
  });

  it('derives a meaningful title from a document heading before falling back to the filename', () => {
    expect(deriveQuizTitle('Proteinbank.pdf', '\nProtein Chemistry\n\n1. What is a protein?')).toBe('Protein Chemistry');
    expect(deriveQuizTitle('Proteinbank.pdf', '1. What is a protein?\nA. A\nB. B')).toBe('Proteinbank');
    expect(sourceFileBaseName('uploads/Proteinbank.v2.pdf')).toBe('Proteinbank v2');
  });

  it('retains non-generic model titles and recognizes only known generic titles', () => {
    expect(isGenericQuizTitle('Extracted Quiz')).toBe(true);
    expect(isGenericQuizTitle('Protein Chemistry')).toBe(false);
    expect(deriveQuizTitle('source.pdf', '')).not.toBe('Extracted Quiz');
  });

  it('bounds and persists the untrusted source filename contract', () => {
    expect(extractionSource).toContain('source_file_name: input.sourceFileName?.trim().slice(0, 255) || null');
    expect(indexSource).toContain('sourceFileName: typeof body.sourceFileName === \'string\' ? body.sourceFileName.slice(0, 255) : undefined');
  });

  it('requires concise, source-grounded explanations in the answer review contract', () => {
    expect(extractionSource).toContain('never fabricate an answer or explanation');
  });

  it('races primary answer-review providers before using the bounded third fallback', () => {
    expect(indexSource).toContain('async function callOpenRouterWithParallelAnswerReviewFallback(');
    expect(indexSource).toContain("'openai/gpt-4o-mini'");
    expect(indexSource).toContain('Promise.any(primaryModels.map(model => callAnswerReviewModel(env, messages, model, options)))');
    expect(indexSource).toContain('strict answer count/index contract');
    expect(indexSource).toContain('models.slice(primaryModels.length)');
    expect(indexSource).toContain('if (isAnswerReview) {\n          const result = await callOpenRouterWithParallelAnswerReviewFallback(');
  });

  it('applies the source title fallback after literal text extraction returns', () => {
    expect(extractionSource).toContain('title: isGenericQuizTitle(result.title) ? deriveQuizTitle(job.source_file_name, text) : result.title.trim()');
    expect(extractionSource).toContain('description: result.description?.trim() || `أسئلة مستخرجة من محتوى');
  });
});
