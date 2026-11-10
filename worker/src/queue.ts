import type { Env } from './platform';

export async function enqueueExtractionJob(env: Env, authHeader: string, jobId: string, taskId?: string): Promise<void> {
  if (!authHeader.startsWith('Bearer ')) throw new Error('Missing authenticated job token');
  // New messages use the server-only key in the consumer. Legacy fallback is
  // retained only until that key is configured in the deployed Worker.
  await env.EXTRACTION_JOBS.send({
    jobId,
    ...(taskId ? { taskId } : {}),
    ...(env.SUPABASE_SERVICE_ROLE_KEY ? {} : { authHeader }),
  });
}

export async function scheduleExtractionJob(env: Env, authHeader: string, jobId: string, taskId?: string): Promise<boolean> {
  try {
    await enqueueExtractionJob(env, authHeader, jobId, taskId);
    return true;
  } catch (error) {
    // The job stays pending and its private source remains in Storage. A later
    // authenticated poll can submit it again after a transient queue failure.
    console.error('Unable to schedule extraction job; inline fallback will be attempted.', { jobId, error });
    return false;
  }
}
