import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock('./supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  },
}));

import { getPdfExportHistory, getPdfExportSignedUrl, savePdfExport } from './db';

const quiz = {
  id: 'quiz-1',
  title: 'مراجعة اللغة العربية',
  description: '',
  creatorId: 'teacher-1',
  creatorName: 'Teacher',
  createdAt: '2026-08-16T12:00:00Z',
  totalPlays: 0,
  avgRating: 0,
  ratingsCount: 0,
  questions: [
    { id: 'q-1', type: 'mcq' as const, text: 'ما معنى الكلمة؟', options: ['أ', 'ب'], correctIndex: 0 },
  ],
};

function createStorageMock() {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/quiz.pdf' }, error: null });
  mocks.storageFrom.mockReturnValue({ upload, remove, createSignedUrl });
  return { upload, remove, createSignedUrl };
}

describe('PDF export history helpers', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.storageFrom.mockReset();
    vi.unstubAllGlobals();
  });

  it('saves the generated PDF under the authenticated user folder and records metadata', async () => {
    const storage = createStorageMock();
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'export-1', quiz_id: 'quiz-1', quiz_title: 'مراجعة اللغة العربية', question_count: 1,
        file_name: 'اختبار_مراجعة_اللغة_العربية.pdf', storage_path: 'user-1/export-1.pdf',
        file_size_bytes: 4, created_at: '2026-08-16T12:00:00Z',
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mocks.from.mockReturnValue({ insert });

    const result = await savePdfExport('user-1', quiz, new Uint8Array([37, 80, 68, 70]), 'اختبار:/العربية.pdf');

    expect(mocks.storageFrom).toHaveBeenCalledWith('quiz-pdf-exports');
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/[0-9a-f-]+\.pdf$/),
      expect.any(Blob),
      expect.objectContaining({ contentType: 'application/pdf', upsert: false }),
    );
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.any(String),
      user_id: 'user-1',
      quiz_id: 'quiz-1',
      file_name: 'اختبار_العربية.pdf',
      file_size_bytes: 4,
    }));
    expect(result).toMatchObject({ id: 'export-1', quizId: 'quiz-1', fileSizeBytes: 4 });
  });

  it('rejects a PDF larger than 5MB before touching storage', async () => {
    const storage = createStorageMock();
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);

    await expect(savePdfExport('user-1', quiz, oversized, 'large.pdf')).rejects.toThrow('smaller than 5 MB');
    expect(storage.upload).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('loads a bounded history page scoped to the requested user', async () => {
    const rows = [{
      id: 'export-1', quiz_id: 'quiz-1', quiz_title: 'Quiz', question_count: 10,
      file_name: 'quiz.pdf', storage_path: 'user-1/export-1.pdf', file_size_bytes: 1024,
      created_at: '2026-08-16T12:00:00Z',
    }];
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    const result = await getPdfExportHistory('user-1', 200);

    expect(mocks.from).toHaveBeenCalledWith('pdf_export_history');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(limit).toHaveBeenCalledWith(50);
    expect(result).toEqual([expect.objectContaining({ id: 'export-1', questionCount: 10 })]);
  });

  it('refuses signed URLs for a storage path outside the current user folder', async () => {
    createStorageMock();
    const record = {
      id: 'export-1', quizTitle: 'Quiz', questionCount: 1, fileName: 'quiz.pdf',
      storagePath: 'another-user/export-1.pdf', fileSizeBytes: 100, createdAt: '2026-08-16T12:00:00Z',
    };

    await expect(getPdfExportSignedUrl('user-1', record)).rejects.toThrow('not available for the current account');
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });

  it('creates a short-lived signed URL only for an owned record', async () => {
    const storage = createStorageMock();
    const record = {
      id: 'export-1', quizTitle: 'Quiz', questionCount: 1, fileName: 'quiz.pdf',
      storagePath: 'user-1/export-1.pdf', fileSizeBytes: 100, createdAt: '2026-08-16T12:00:00Z',
    };

    await expect(getPdfExportSignedUrl('user-1', record)).resolves.toBe('https://signed.example/quiz.pdf');
    expect(mocks.storageFrom).toHaveBeenCalledWith('quiz-pdf-exports');
    expect(storage.createSignedUrl).toHaveBeenCalledWith('user-1/export-1.pdf', 120);
  });
});
