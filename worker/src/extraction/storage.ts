import type { CreateExtractionJobInput, ExtractionJobEnv } from './types';

export const BUCKET = 'quiz-extraction-uploads';
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export const supportedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export function apiUrl(env: ExtractionJobEnv, path: string): string {
  return `${env.SUPABASE_URL.replace(/\/$/, '')}${path}`;
}

export function databaseHeaders(env: ExtractionJobEnv, authHeader: string, extra: HeadersInit = {}): HeadersInit {
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: authHeader,
    ...extra,
  };
}

export function encodeStoragePath(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

/**
 * Hardened OWASP path traversal defense for Supabase storage paths.
 * Rejects:
 * - non-string paths or userIds
 * - lengths outside 3..512
 * - null-bytes (\0, %00)
 * - carriage returns (\r), newlines (\n), tabs (\t)
 * - backslashes (\)
 * - URL-encoded path traversals (%2e, %2f, %5c)
 * - paths with fewer than 3 segments
 * - paths where the first segment does not strictly match the authenticated userId
 * - segments containing characters outside [a-zA-Z0-9_\-\.] or equal to '.' or '..'
 */
export function isSafeStoragePath(path: string, userId: string): boolean {
  if (typeof path !== 'string' || typeof userId !== 'string' || !userId) return false;
  if (path.length < 3 || path.length > 512) return false;
  if (/[\0\r\n\t]/.test(path) || path.includes('\\')) return false;
  if (/%00|%2e|%2f|%5c/i.test(path)) return false;

  const segments = path.split('/');
  if (segments.length < 3 || segments[0] !== userId) return false;
  return segments.every(s => /^[a-zA-Z0-9_\-\.]+$/.test(s) && s !== '.' && s !== '..');
}

export function isValidIdempotencyKey(value: string): boolean {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(value);
}

export function validateCreateExtractionJobInput(input: CreateExtractionJobInput, userId: string): string | null {
  if (!input || typeof input !== 'object') return 'Invalid input.';
  if (!isValidIdempotencyKey(input.idempotencyKey)) return 'Invalid idempotency key.';
  if (!isSafeStoragePath(input.fileStoragePath, userId)) return 'Invalid file storage path.';
  if (!supportedMimeTypes.has(input.mimeType)) return 'Unsupported file type.';
  if (input.extractionMode !== 'literal' && input.extractionMode !== 'generate') return 'Invalid extraction mode.';
  if (input.customInstruction && input.customInstruction.length > 2000) return 'Custom instruction is too long.';
  if (input.requestedQuestionCount != null && (!Number.isInteger(input.requestedQuestionCount) || input.requestedQuestionCount < 1 || input.requestedQuestionCount > 500)) return 'Invalid question count.';
  return null;
}

export async function downloadSourceFile(
  env: ExtractionJobEnv,
  authHeader: string,
  path: string,
  userId?: string,
): Promise<Uint8Array> {
  if (userId && !isSafeStoragePath(path, userId)) {
    throw new Error('Invalid file storage path.');
  }
  const response = await fetch(apiUrl(env, `/storage/v1/object/authenticated/${BUCKET}/${encodeStoragePath(path)}`), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) throw new Error(response.status === 404 ? 'Source upload is no longer available.' : `Source download failed: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  if (!arrayBuffer.byteLength || arrayBuffer.byteLength > MAX_SOURCE_BYTES) throw new Error('Source file exceeds the processing limit.');
  return new Uint8Array(arrayBuffer);
}

export async function deleteSourceFile(env: ExtractionJobEnv, authHeader: string, path: string): Promise<void> {
  try {
    await fetch(apiUrl(env, `/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`), {
      method: 'DELETE',
      headers: databaseHeaders(env, authHeader),
    });
  } catch (error) {
    console.warn('Extraction source cleanup failed.', error);
  }
}
