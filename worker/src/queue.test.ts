import { describe, expect, it, vi } from 'vitest';
import { enqueueExtractionJob, scheduleExtractionJob } from './queue';

describe('extraction queue scheduling', () => {
  it('includes the task id in the queued message', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const env = {
      EXTRACTION_JOBS: { send },
      SUPABASE_SERVICE_ROLE_KEY: 'server-key',
    } as any;

    await enqueueExtractionJob(env, 'Bearer user-token', 'job-1', 'task-1');

    expect(send).toHaveBeenCalledWith({ jobId: 'job-1', taskId: 'task-1' });
  });

  it('reports successful queue delivery', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const env = { EXTRACTION_JOBS: { send } } as any;

    await expect(scheduleExtractionJob(env, 'Bearer user-token', 'job-1')).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('reports queue delivery failure so the caller can use the fallback', async () => {
    const send = vi.fn().mockRejectedValue(new Error('queue unavailable'));
    const env = { EXTRACTION_JOBS: { send } } as any;
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(scheduleExtractionJob(env, 'Bearer user-token', 'job-1')).resolves.toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('rejects missing bearer authentication before enqueueing', async () => {
    const send = vi.fn();
    const env = { EXTRACTION_JOBS: { send } } as any;

    await expect(enqueueExtractionJob(env, '', 'job-1')).rejects.toThrow('Missing authenticated job token');
    expect(send).not.toHaveBeenCalled();
  });
});
