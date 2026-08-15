import { describe, expect, it } from 'vitest';
import { buildVisionChunkRanges, selectVisionChunkPlan, visionChunkRetryDelaySeconds } from './extractionJobs';

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
});
