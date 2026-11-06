import { describe, expect, it } from 'vitest';
import { computeFileFingerprint } from './fileFingerprint';

describe('file fingerprinting', () => {
  it('uses content bytes as the stable hash and metadata in the owner-scoped resume key', async () => {
    const bytes = new TextEncoder().encode('same content');
    const first = await computeFileFingerprint(bytes, 'Exam.pdf', 'application/pdf', 'user-a');
    const renamed = await computeFileFingerprint(bytes, 'renamed.pdf', 'application/pdf', 'user-a');
    const otherUser = await computeFileFingerprint(bytes, 'Exam.pdf', 'application/pdf', 'user-b');

    expect(first.contentHash).toBe(renamed.contentHash);
    expect(first.resumeKey).not.toBe(renamed.resumeKey);
    expect(first.resumeKey).not.toBe(otherUser.resumeKey);
    expect(first.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
