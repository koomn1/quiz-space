import { describe, it, expect } from 'vitest';
import {
  saveTempAttachment,
  getLatestTempAttachmentForConversation,
  formatBytes,
} from './tempFileStorage';

describe('tempFileStorage service', () => {
  it('formats byte units correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('handles getLatestTempAttachmentForConversation without throwing in node test environment', async () => {
    // In node/vitest environment window.indexedDB might be absent, so it should resolve null gracefully
    const result = await getLatestTempAttachmentForConversation('conv-test-123');
    expect(result).toBeNull();
  });
});
