import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchWithAuth: vi.fn(),
  getSession: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../lib/origin', () => ({ getApiUrl: (path: string) => `https://worker.test${path}` }));
vi.mock('../lib/authFetch', () => ({ fetchWithAuth: mocks.fetchWithAuth }));
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    storage: { from: mocks.storageFrom },
  },
}));

import { createExtractionJob, getExtractionJob } from './aiWorkerClient';

const pendingJob = {
  id: '50c9f8ce-8bc9-4976-a871-b8ec28c164a0',
  status: 'pending',
  progressPercentage: 0,
  processedChunks: 0,
  totalChunks: null,
  progressMessage: 'تم استلام الملف وتجهيز مهمة الاستخراج.',
  quiz: null,
  errorMessage: null,
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
} as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

function testFile(): File {
  return Object.assign(new Blob(['1. ما الإجابة الصحيحة؟'], { type: 'application/pdf' }), { name: 'exam.pdf' }) as File;
}

describe('internal extraction-job client', () => {
  beforeEach(() => {
    mocks.fetchWithAuth.mockReset();
    mocks.getSession.mockReset();
    mocks.storageFrom.mockReset();
    mocks.upload.mockReset();
    mocks.remove.mockReset();
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'e3d7cade-5413-44f7-8f28-6dfbfdb1daec' } } }, error: null });
    mocks.storageFrom.mockReturnValue({ upload: mocks.upload, remove: mocks.remove });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uploads the private source and returns a job id without waiting for extraction', async () => {
    mocks.fetchWithAuth.mockResolvedValueOnce(jsonResponse({ job: pendingJob }, 202));

    await expect(createExtractionJob({
      file: testFile(), extractionMode: 'literal', requestedQuestionCount: 5,
    })).resolves.toMatchObject({ id: pendingJob.id, status: 'pending' });

    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.fetchWithAuth).toHaveBeenCalledWith(
      'https://worker.test/api/ai/extraction-jobs',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns persisted progress updates while a job is processing', async () => {
    mocks.fetchWithAuth.mockResolvedValueOnce(jsonResponse({
      ...pendingJob,
      status: 'processing',
      progressPercentage: 55,
      processedChunks: 2,
      totalChunks: 4,
      progressMessage: 'معالجة الجزء 2/4 واستخراج 12 سؤالاً.',
    }));

    await expect(getExtractionJob(pendingJob.id)).resolves.toMatchObject({
      status: 'processing', progressPercentage: 55, processedChunks: 2, totalChunks: 4,
    });
    expect(mocks.fetchWithAuth).toHaveBeenCalledWith(
      `https://worker.test/api/ai/extraction-jobs/${pendingJob.id}`,
      { method: 'GET' },
    );
  });

  it('returns a completed structured quiz that the editor can populate', async () => {
    mocks.fetchWithAuth.mockResolvedValueOnce(jsonResponse({
      ...pendingJob,
      status: 'complete',
      progressPercentage: 100,
      quiz: {
        title: 'اختبار علوم',
        description: 'أسئلة مستخرجة',
        questions: [{ number: 1, text: 'ما وحدة قياس القوة؟', type: 'mcq', options: ['نيوتن', 'متر'], correctIndex: 0, correctAnswer: 'نيوتن', explanation: '' }],
      },
    }));

    await expect(getExtractionJob(pendingJob.id)).resolves.toMatchObject({
      status: 'complete', quiz: { title: 'اختبار علوم', questions: [expect.objectContaining({ text: 'ما وحدة قياس القوة؟' })] },
    });
  });

  it('reuses the remembered job for the same idempotency key instead of uploading or posting twice', async () => {
    mocks.fetchWithAuth.mockResolvedValueOnce(jsonResponse({ job: pendingJob }, 202));
    await createExtractionJob({ file: testFile(), extractionMode: 'literal', requestedQuestionCount: 5, idempotencyKey: 'same-request-key-0001' });

    mocks.fetchWithAuth.mockResolvedValueOnce(jsonResponse({ ...pendingJob, status: 'processing' }));
    await expect(createExtractionJob({
      file: testFile(), extractionMode: 'literal', requestedQuestionCount: 5, idempotencyKey: 'same-request-key-0001',
    })).resolves.toMatchObject({ id: pendingJob.id, status: 'processing' });

    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.fetchWithAuth).toHaveBeenCalledTimes(2);
  });
});
