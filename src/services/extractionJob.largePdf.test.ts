import { describe, expect, it } from 'vitest';
import { buildVisionChunkRanges, shouldUseVisionForLargeScannedPdf, shouldUseVisionForScannedPdf, VISION_CHUNK_PAGE_COUNT } from '../../worker/src/extractionJobs';

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

  it('routes a short scanned PDF with no text sample to persisted vision chunks', () => {
    expect(shouldUseVisionForScannedPdf(9, '')).toBe(true);
    expect(shouldUseVisionForScannedPdf(9, 'Question 1. Which statement is correct? Choose the best answer from the available options below.')).toBe(false);
    expect(buildVisionChunkRanges(9)).toEqual([
      { chunkIndex: 0, pageStart: 1, pageEnd: 4 },
      { chunkIndex: 1, pageStart: 5, pageEnd: 8 },
      { chunkIndex: 2, pageStart: 9, pageEnd: 9 },
    ]);
  });

  it('creates independently retryable four-page ranges for a 37-page scanned PDF', () => {
    expect(VISION_CHUNK_PAGE_COUNT).toBe(4);
    expect(buildVisionChunkRanges(37)).toEqual([
      { chunkIndex: 0, pageStart: 1, pageEnd: 4 },
      { chunkIndex: 1, pageStart: 5, pageEnd: 8 },
      { chunkIndex: 2, pageStart: 9, pageEnd: 12 },
      { chunkIndex: 3, pageStart: 13, pageEnd: 16 },
      { chunkIndex: 4, pageStart: 17, pageEnd: 20 },
      { chunkIndex: 5, pageStart: 21, pageEnd: 24 },
      { chunkIndex: 6, pageStart: 25, pageEnd: 28 },
      { chunkIndex: 7, pageStart: 29, pageEnd: 32 },
      { chunkIndex: 8, pageStart: 33, pageEnd: 36 },
      { chunkIndex: 9, pageStart: 37, pageEnd: 37 },
    ]);
  });
});
