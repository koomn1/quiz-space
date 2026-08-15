import { describe, expect, it } from 'vitest';
import { buildVisionChunkRanges, shouldUseVisionForLargeScannedPdf, VISION_CHUNK_PAGE_COUNT } from '../../worker/src/extractionJobs';

describe('large scanned PDF routing', () => {
  it('routes a large PDF with no sampled text to the chunked vision path', () => {
    expect(shouldUseVisionForLargeScannedPdf(37, '')).toBe(true);
  });

  it('keeps a large text PDF on the lossless text path', () => {
    expect(shouldUseVisionForLargeScannedPdf(37, 'Question 1. Which statement is correct? Choose the best answer from the options below.')).toBe(false);
  });

  it('does not apply the sampled-text shortcut to short PDFs', () => {
    expect(shouldUseVisionForLargeScannedPdf(8, '')).toBe(false);
  });

  it('creates independently retryable five-page ranges for a 37-page scanned PDF', () => {
    expect(VISION_CHUNK_PAGE_COUNT).toBe(5);
    expect(buildVisionChunkRanges(37)).toEqual([
      { chunkIndex: 0, pageStart: 1, pageEnd: 5 },
      { chunkIndex: 1, pageStart: 6, pageEnd: 10 },
      { chunkIndex: 2, pageStart: 11, pageEnd: 15 },
      { chunkIndex: 3, pageStart: 16, pageEnd: 20 },
      { chunkIndex: 4, pageStart: 21, pageEnd: 25 },
      { chunkIndex: 5, pageStart: 26, pageEnd: 30 },
      { chunkIndex: 6, pageStart: 31, pageEnd: 35 },
      { chunkIndex: 7, pageStart: 36, pageEnd: 37 },
    ]);
  });
});
