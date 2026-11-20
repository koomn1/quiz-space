import { describe, expect, it } from 'vitest';
import {
  encodeStoragePath,
  isSafeStoragePath,
  isValidIdempotencyKey,
  supportedMimeTypes,
  validateCreateExtractionJobInput,
  downloadSourceFile,
} from './storage';

describe('worker/src/extraction/storage: OWASP Hardening & Path Validation', () => {
  const validUserId = '00000000-0000-4000-8000-000000000001';

  describe('isSafeStoragePath - Path Traversal & Injection Defense', () => {
    it('accepts valid tenant-scoped storage paths with at least 3 segments', () => {
      expect(isSafeStoragePath(`${validUserId}/uploads/document.pdf`, validUserId)).toBe(true);
      expect(isSafeStoragePath(`${validUserId}/sub-folder_1/doc.v2.docx`, validUserId)).toBe(true);
      expect(isSafeStoragePath(`${validUserId}/a/b/c/file.png`, validUserId)).toBe(true);
    });

    it('rejects path traversal using .. or backslashes', () => {
      expect(isSafeStoragePath(`${validUserId}/../other-user/file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/..\\other-user\\file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}\\uploads\\document.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`..\\${validUserId}/uploads/doc.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/folder/../file.pdf`, validUserId)).toBe(false);
    });

    it('rejects null byte injection (raw and URL-encoded)', () => {
      expect(isSafeStoragePath(`${validUserId}/uploads/document.pdf\0.txt`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/uploads/%00document.pdf`, validUserId)).toBe(false);
    });

    it('rejects newline, carriage return, and tab characters', () => {
      expect(isSafeStoragePath(`${validUserId}/uploads/\ndocument.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/uploads/\rdocument.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/uploads/\tdocument.pdf`, validUserId)).toBe(false);
    });

    it('rejects URL-encoded traversal sequences (%2e%2e, %2f, %5c)', () => {
      expect(isSafeStoragePath(`${validUserId}/%2e%2e/target/file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/%2E%2E/target/file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/folder%2ffile.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/folder%5cfile.pdf`, validUserId)).toBe(false);
    });

    it('rejects paths where first segment does not match the authenticated userId', () => {
      expect(isSafeStoragePath(`attacker-id/uploads/file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`guest/uploads/file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`/uploads/file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`uploads/${validUserId}/file.pdf`, validUserId)).toBe(false);
    });

    it('rejects paths with fewer than 3 segments', () => {
      expect(isSafeStoragePath(`${validUserId}/file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(validUserId, validUserId)).toBe(false);
    });

    it('rejects paths outside length bounds (3..512)', () => {
      expect(isSafeStoragePath('ab', validUserId)).toBe(false);
      const longSegment = 'a'.repeat(510);
      expect(isSafeStoragePath(`${validUserId}/${longSegment}/file.pdf`, validUserId)).toBe(false);
    });

    it('rejects invalid segment characters outside the safe character set', () => {
      expect(isSafeStoragePath(`${validUserId}/uploads/file;rm.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/uploads/file$test.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/uploads/file<tag>.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/uploads/file|pipe.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/./file.pdf`, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/../file.pdf`, validUserId)).toBe(false);
    });

    it('rejects non-string or empty inputs safely', () => {
      expect(isSafeStoragePath(null as any, validUserId)).toBe(false);
      expect(isSafeStoragePath(undefined as any, validUserId)).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/uploads/file.pdf`, '')).toBe(false);
      expect(isSafeStoragePath(`${validUserId}/uploads/file.pdf`, null as any)).toBe(false);
    });
  });

  describe('encodeStoragePath', () => {
    it('encodes each segment without escaping forward slashes', () => {
      expect(encodeStoragePath('user/uploads/my file.pdf')).toBe('user/uploads/my%20file.pdf');
      expect(encodeStoragePath('u-1/folder/doc#1.pdf')).toBe('u-1/folder/doc%231.pdf');
    });
  });

  describe('supportedMimeTypes', () => {
    it('accepts documents, spreadsheets, presentations, text, and modern images', () => {
      expect(supportedMimeTypes.has('application/pdf')).toBe(true);
      expect(supportedMimeTypes.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
      expect(supportedMimeTypes.has('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
      expect(supportedMimeTypes.has('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true);
      expect(supportedMimeTypes.has('text/plain')).toBe(true);
      expect(supportedMimeTypes.has('image/png')).toBe(true);
      expect(supportedMimeTypes.has('image/jpeg')).toBe(true);
      expect(supportedMimeTypes.has('image/webp')).toBe(true);
      expect(supportedMimeTypes.has('image/gif')).toBe(true);
      expect(supportedMimeTypes.has('image/avif')).toBe(true);
    });

    it('rejects unsupported or executable MIME types', () => {
      expect(supportedMimeTypes.has('application/x-msdownload')).toBe(false);
      expect(supportedMimeTypes.has('application/javascript')).toBe(false);
      expect(supportedMimeTypes.has('text/html')).toBe(false);
      expect(supportedMimeTypes.has('video/mp4')).toBe(false);
    });
  });

  describe('isValidIdempotencyKey', () => {
    it('accepts valid 16-128 alphanumeric strings with hyphens and underscores', () => {
      expect(isValidIdempotencyKey('1234567890abcdef')).toBe(true);
      expect(isValidIdempotencyKey('idem-key_1234567890_test')).toBe(true);
      expect(isValidIdempotencyKey('a'.repeat(128))).toBe(true);
    });

    it('rejects too short, too long, or characters with special symbols', () => {
      expect(isValidIdempotencyKey('short-key')).toBe(false);
      expect(isValidIdempotencyKey('a'.repeat(129))).toBe(false);
      expect(isValidIdempotencyKey('invalid.key.with.dots!!')).toBe(false);
      expect(isValidIdempotencyKey('spaces in key 12345678')).toBe(false);
      expect(isValidIdempotencyKey(null as any)).toBe(false);
    });
  });

  describe('validateCreateExtractionJobInput', () => {
    const validBase = {
      idempotencyKey: 'idempotency-key-123456',
      fileStoragePath: `${validUserId}/uploads/doc.pdf`,
      mimeType: 'application/pdf',
      extractionMode: 'literal' as const,
      requestedQuestionCount: 10,
    };

    it('returns null for valid input', () => {
      expect(validateCreateExtractionJobInput(validBase, validUserId)).toBeNull();
    });

    it('rejects input with invalid idempotency key', () => {
      expect(validateCreateExtractionJobInput({ ...validBase, idempotencyKey: 'bad' }, validUserId)).toBe('Invalid idempotency key.');
    });

    it('rejects input with unsafe storage path or user ID mismatch', () => {
      expect(validateCreateExtractionJobInput({ ...validBase, fileStoragePath: 'other/uploads/doc.pdf' }, validUserId)).toBe('Invalid file storage path.');
      expect(validateCreateExtractionJobInput({ ...validBase, fileStoragePath: `${validUserId}/../doc.pdf` }, validUserId)).toBe('Invalid file storage path.');
    });

    it('rejects unsupported mime type', () => {
      expect(validateCreateExtractionJobInput({ ...validBase, mimeType: 'audio/mp3' }, validUserId)).toBe('Unsupported file type.');
    });

    it('rejects invalid extraction mode', () => {
      expect(validateCreateExtractionJobInput({ ...validBase, extractionMode: 'unknown' as any }, validUserId)).toBe('Invalid extraction mode.');
    });

    it('rejects oversized custom instruction (>2000 chars)', () => {
      expect(validateCreateExtractionJobInput({ ...validBase, customInstruction: 'x'.repeat(2001) }, validUserId)).toBe('Custom instruction is too long.');
    });

    it('rejects invalid question count', () => {
      expect(validateCreateExtractionJobInput({ ...validBase, requestedQuestionCount: 0 }, validUserId)).toBe('Invalid question count.');
      expect(validateCreateExtractionJobInput({ ...validBase, requestedQuestionCount: 501 }, validUserId)).toBe('Invalid question count.');
      expect(validateCreateExtractionJobInput({ ...validBase, requestedQuestionCount: 3.5 }, validUserId)).toBe('Invalid question count.');
    });
  });

  describe('downloadSourceFile defense-in-depth', () => {
    it('throws error immediately if userId is provided and path is unsafe', async () => {
      const mockEnv = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon' };
      await expect(downloadSourceFile(mockEnv, 'Bearer token', `${validUserId}/../hacked.pdf`, validUserId)).rejects.toThrow('Invalid file storage path.');
    });
  });
});
