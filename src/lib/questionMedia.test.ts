import { describe, expect, it } from 'vitest';
import {
  fileExtensionForImageMimeType,
  isDurableQuestionImageUrl,
  isInlineImageDataUrl,
  parseInlineImageDataUrl,
} from './questionMedia';

describe('question media normalization', () => {
  it('preserves GIF as GIF bytes and MIME', () => {
    const parsed = parseInlineImageDataUrl('data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=');
    expect(parsed?.mimeType).toBe('image/gif');
    expect(parsed?.bytes.length).toBeGreaterThan(0);
    expect(fileExtensionForImageMimeType(parsed?.mimeType || '')).toBe('gif');
  });

  it('recognizes only base64 inline image data URLs', () => {
    expect(isInlineImageDataUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isInlineImageDataUrl('data:text/plain;base64,AAAA')).toBe(false);
    expect(isInlineImageDataUrl('https://example.com/image.gif')).toBe(false);
  });

  it('accepts durable HTTP(S) media URLs but not blob or data URLs', () => {
    expect(isDurableQuestionImageUrl('https://cdn.example.com/q.gif')).toBe(true);
    expect(isDurableQuestionImageUrl('http://cdn.example.com/q.png')).toBe(true);
    expect(isDurableQuestionImageUrl('blob:https://quiz-space.example/id')).toBe(false);
    expect(isDurableQuestionImageUrl('data:image/png;base64,AAAA')).toBe(false);
  });

  it('rejects malformed or unsupported inline images', () => {
    expect(parseInlineImageDataUrl('data:image/gif;base64,not-base64')).toBeNull();
    expect(parseInlineImageDataUrl('data:image/svg+xml;base64,PHN2Zy8+')).toBeNull();
  });
});
