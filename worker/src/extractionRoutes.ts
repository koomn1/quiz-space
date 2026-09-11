import {
  createOrGetExtractionJob,
  getExtractionJob,
  listActiveExtractionJobs,
  restartExpiredJob,
  validateCreateExtractionJobInput,
  type ExtractionJobRow,
} from './extractionJobs';
import { claimTask, taskIdempotencyKey } from './taskLedger';
import { scheduleExtractionJob } from './queue';
import { publicExtractionJob, type Env } from './platform';
import { json, isAuthenticated, type RouteContext, type RouteResult, routePath } from './routes';

function isExtractionPath(path: string): boolean {
  return path === '/api/ai/extraction-jobs' || /^\/api\/ai\/extraction-jobs\/[0-9a-f-]{36}$/i.test(path);
}

export function isExtractionJobRequest(request: Request): boolean {
  return isExtractionPath(routePath(request));
}

export async function handleExtractionRoutes(context: RouteContext): Promise<RouteResult> {
  const path = routePath(context.request);
  if (!isExtractionPath(path)) return null;
  if (!isAuthenticated(context.userId)) return json({ error: 'Authentication required' }, 401, context.headers);

  if (context.request.method === 'GET') {
    if (path === '/api/ai/extraction-jobs') {
      const jobs = await listActiveExtractionJobs(context.env, context.authHeader);
      const resumable: ExtractionJobRow[] = [];
      for (const job of jobs) {
        const current = await restartExpiredJob(context.env, context.authHeader, job);
        if (current.status === 'pending') await scheduleExtractionJob(context.env, context.authHeader, current.id);
        resumable.push(current);
      }
      return json({ jobs: resumable.map(publicExtractionJob) }, 200, context.headers);
    }
    const jobId = path.split('/').pop() || '';
    let job = await getExtractionJob(context.env, context.authHeader, jobId);
    if (!job) return json({ error: 'Extraction job not found' }, 404, context.headers);
    job = await restartExpiredJob(context.env, context.authHeader, job);
    if (job.status === 'pending') await scheduleExtractionJob(context.env, context.authHeader, job.id);
    return json(publicExtractionJob(job), 200, context.headers);
  }

  if (context.request.method !== 'POST' || path !== '/api/ai/extraction-jobs') {
    return json({ error: 'Method not allowed' }, 405, context.headers);
  }
  const body = await context.request.json() as Record<string, unknown>;
  const input = {
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '',
    fileStoragePath: typeof body.fileStoragePath === 'string' ? body.fileStoragePath : '',
    mimeType: typeof body.mimeType === 'string' ? body.mimeType : '',
    sourceFileName: typeof body.sourceFileName === 'string' ? body.sourceFileName.slice(0, 255) : undefined,
    extractionMode: body.extractionMode === 'generate' ? 'generate' as const : 'literal' as const,
    customInstruction: typeof body.customInstruction === 'string' ? body.customInstruction : undefined,
    requestedQuestionCount: Number.isInteger(body.requestedQuestionCount) && Number(body.requestedQuestionCount) > 0 ? Number(body.requestedQuestionCount) : undefined,
  };
  const validationError = validateCreateExtractionJobInput(input, context.userId);
  if (validationError) return json({ error: 'Invalid extraction job request' }, 400, context.headers);

  let job = await createOrGetExtractionJob(context.env, context.authHeader, context.userId, input);
  let taskId: string | undefined;
  // The extraction_jobs unique idempotency constraint remains the source of truth.
  // The unified ledger adds cross-workload observability and prevents duplicate queue ownership.
  try {
    const task = await claimTask(context.env, context.authHeader, {
      taskType: 'extraction',
      idempotencyKey: taskIdempotencyKey('extraction', input.idempotencyKey),
      userId: context.userId,
      maxAttempts: 3,
    });
    taskId = task?.id;
  } catch (error) {
    console.error('Task ledger claim failed; extraction job remains available', error);
  }
  job = await restartExpiredJob(context.env, context.authHeader, job);
  if (job.status === 'pending') await scheduleExtractionJob(context.env, context.authHeader, job.id, taskId);
  return json({ job: publicExtractionJob(job) }, 202, context.headers);
}
