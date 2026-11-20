import {
  getExtractionJob,
  processExtractionJob,
  processExtractionJobChunk,
  visionChunkRetryDelaySeconds,
} from './extractionJobs';
import { finishTask, retryDelaySeconds } from './taskLedger';
import type { Env, ExtractionQueueMessage } from './platform';

export async function handleQueueBatch(
  batch: {
    messages: Array<{
      body: ExtractionQueueMessage;
      attempts?: number;
      ack: () => void;
      retry: (options?: { delaySeconds?: number }) => void;
    }>;
  },
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    const { jobId, authHeader: queuedAuthHeader, chunkId, taskId } = message.body || ({} as ExtractionQueueMessage);
    const workerAuthHeader = env.SUPABASE_SERVICE_ROLE_KEY
      ? `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      : queuedAuthHeader;
    if (!jobId || !workerAuthHeader?.startsWith('Bearer ')) {
      console.warn('Discarding malformed extraction queue message.');
      message.ack();
      continue;
    }
    if (chunkId) {
      const attempts = message.attempts || 1;
      const outcome = await processExtractionJobChunk(env, workerAuthHeader, jobId, chunkId, attempts);
      if (outcome === 'retry') {
        const delaySeconds = visionChunkRetryDelaySeconds(attempts);
        if (taskId && attempts >= 3) {
          await finishTask(env, workerAuthHeader, taskId, 'dead_letter', 'Extraction chunk exceeded the retry limit.');
        }
        message.retry({ delaySeconds });
        continue;
      }
      const latestJob = await getExtractionJob(env, workerAuthHeader, jobId);
      if (taskId && latestJob?.status === 'complete') {
        await finishTask(env, workerAuthHeader, taskId, 'succeeded');
      } else if (taskId && latestJob?.status === 'error') {
        await finishTask(
          env,
          workerAuthHeader,
          taskId,
          'failed',
          latestJob.error_message || 'Extraction chunk processing failed.',
        );
      }
      message.ack();
      continue;
    }
    const attempts = message.attempts || 1;
    try {
      await processExtractionJob(env, workerAuthHeader, jobId, async (parentJobId, chunkIds) => {
        await Promise.all(
          chunkIds.map((id) =>
            env.EXTRACTION_JOBS.send({
              jobId: parentJobId,
              chunkId: id,
              ...(taskId ? { taskId } : {}),
              ...(env.SUPABASE_SERVICE_ROLE_KEY ? {} : { authHeader: workerAuthHeader }),
            }),
          ),
        );
      });
      const latestJob = await getExtractionJob(env, workerAuthHeader, jobId);
      if (taskId && latestJob?.status === 'complete') {
        await finishTask(env, workerAuthHeader, taskId, 'succeeded');
      } else if (taskId && latestJob?.status === 'error') {
        await finishTask(env, workerAuthHeader, taskId, 'failed', latestJob.error_message || 'Extraction job failed.');
      }
      message.ack();
    } catch (error) {
      const retryable = attempts < 3;
      if (taskId) {
        await finishTask(env, workerAuthHeader, taskId, retryable ? 'failed' : 'dead_letter', String(error));
      }
      if (retryable) message.retry({ delaySeconds: retryDelaySeconds(attempts) });
      else message.ack();
    }
  }
}
