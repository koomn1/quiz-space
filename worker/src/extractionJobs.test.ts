import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyRequestedQuestionCount, buildVisionChunkRanges, deriveQuizTitle, isGenericQuizTitle, selectVisionChunkPlan, sourceFileBaseName, validateCreateExtractionJobInput, visionChunkRetryDelaySeconds } from './extractionJobs';

const extractionSource = readFileSync(new URL('./extractionJobs.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const routeSource = readFileSync(new URL('./extractionRoutes.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const providerChainSource = readFileSync(new URL('./providerChain.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('dynamic vision chunk planning', () => {
  it('keeps the default four-page split for a normal scanned document', () => {
    const plan = selectVisionChunkPlan(9, 9 * 220 * 1024);
    expect(plan.pageCountPerChunk).toBe(4);
    expect(plan.concurrency).toBe(3);
    expect(plan.estimatedChunkCount).toBe(3);
    expect(buildVisionChunkRanges(9, plan.pageCountPerChunk)).toEqual([
      { chunkIndex: 0, pageStart: 1, pageEnd: 4 },
      { chunkIndex: 1, pageStart: 5, pageEnd: 8 },
      { chunkIndex: 2, pageStart: 9, pageEnd: 9 },
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

  it('never truncates literal extraction, even when a legacy job contains a requested count', () => {
    const questions = Array.from({ length: 5 }, (_, index) => ({ text: `Question ${index + 1}` }));
    expect(applyRequestedQuestionCount(questions, 'literal', 2)).toHaveLength(5);
    expect(applyRequestedQuestionCount(questions, 'generate', 2)).toHaveLength(2);
    expect(extractionSource).toContain("extractionMode !== 'generate'");
    expect(extractionSource).toContain('const automaticCount = Math.min(500, Math.max(3, Math.ceil(text.length / 1400)));');
    expect(extractionSource).toContain('const requestedCount = job.requested_question_count || automaticCount;');
    expect(routeSource).toContain("requestedQuestionCount: extractionMode === 'generate'");
  });

  it('keeps answer accuracy strict instead of silently defaulting to option zero', () => {
    expect(extractionSource).toContain('If the source has no answer key, use null and do not guess.');
    expect(extractionSource).toContain('لا تستخدم correctIndex=-1 أو إجابة فارغة للأسئلة الموضوعية');
    expect(extractionSource).toContain("correctIndex: type === 'essay' ? -1 : resolveCorrectIndex(raw, options, type)");
    expect(extractionSource).toContain('return -1;');
    expect(extractionSource).toContain('question.correctIndex < 0');
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

  it('validates answer-review responses inside the bounded provider fallback chain', () => {
    expect(indexSource).toContain('export async function callAiWithParallelAnswerReviewFallback(');
    expect(indexSource).toContain('validateResponse: (text, _provider, model) =>');
    expect(indexSource).toContain('validateAnswerReviewResponse(text, expectedAnswerCount, model');
    expect(providerChainSource).toContain('options.validateResponse?.(text, provider, model)');
    expect(providerChainSource).toContain("[callInception, 'inception', INCEPTION_MODEL], [callGroq, 'groq', GROQ_MODEL], [callOpenAI, 'openai', OPENAI_MODEL]");
  });

  it('applies the source title fallback after literal text extraction returns', () => {
    expect(extractionSource).toContain('title: isGenericQuizTitle(result.title) ? deriveQuizTitle(job.source_file_name, text) : result.title.trim()');
    expect(extractionSource).toContain('description: result.description?.trim() || `أسئلة مستخرجة من محتوى');
  });
});
