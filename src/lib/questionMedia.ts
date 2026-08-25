export const QUIZ_QUESTION_MEDIA_BUCKET = 'quiz-question-media';
export const QUIZ_QUESTION_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_QUESTION_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export type InlineImageData = {
  mimeType: string;
  bytes: Uint8Array;
};

export function isInlineImageDataUrl(value: string): boolean {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value.trim());
}

export function parseInlineImageDataUrl(value: string): InlineImageData | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(value.trim());
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  if (!SUPPORTED_QUESTION_IMAGE_MIME_TYPES.has(mimeType)) return null;

  const payload = match[2].replace(/\s/g, '');
  if (!payload) return null;

  try {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return { mimeType, bytes };
  } catch {
    return null;
  }
}

export function fileExtensionForImageMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/gif': return 'gif';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    case 'image/jpeg': return 'jpg';
    default: return 'img';
  }
}

export function isDurableQuestionImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isTransientQuestionImageUrl(value: string): boolean {
  return value.trim().startsWith('blob:');
}
