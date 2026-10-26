import {
  controlExtractionJob,
  createOrGetExtractionJob,
  getExtractionJob,
  listActiveExtractionJobs,
  processExtractionJob,
  restartExpiredJob,
  validateCreateExtractionJobInput,
  type ExtractionJobControl,
  type ExtractionJobRow,
} from './extractionJobs';
import { claimTask, taskIdempotencyKey } from './taskLedger';
import { scheduleExtractionJob } from './queue';
import { publicExtractionJob, type Env } from './platform';
import { json, isAuthenticated, type RouteContext, type RouteResult, routePath } from './routes';

const JOB_ID = '[0-9a-f-]{36}';
function isExtractionPath(path: string): boolean {
  return path === '/api/ai/extraction-jobs'
    || new RegExp(`^/api/ai/extraction-jobs/${JOB_ID}$`, 'i').test(path)
    || new RegExp(`^/api/ai/extraction-jobs/${JOB_ID}/(pause|resume|cancel|retry-failed)$`, 'i').test(path);
}
export function isExtractionJobRequest(request: Request): boolean {
  return isExtractionPath(routePath(request));
}

const controls = new Set<ExtractionJobControl>(['pause', 'resume', 'cancel', 'retry-failed']);

function startPendingExtraction(context: RouteContext, jobId: string): void {
  if (!context.executionCtx) return;
  const workerAuthHeader = context.env.SUPABASE_SERVICE_ROLE_KEY
    ? `Bearer ${context.env.SUPABASE_SERVICE_ROLE_KEY}`
    : context.authHeader;
  context.executionCtx.waitUntil((async () => {
    try {
      await processExtractionJob(context.env, workerAuthHeader, jobId, async (parentJobId, chunkIds) => {
        await Promise.all(chunkIds.map(chunkId => context.env.EXTRACTION_JOBS.send({
          jobId: parentJobId,
          chunkId,
          ...(context.env.SUPABASE_SERVICE_ROLE_KEY ? {} : { authHeader: workerAuthHeader }),
        })));
      });
    } catch (error) {
      console.error('Inline extraction fallback failed; queue retry remains available.', { jobId, error });
    }
  })());
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
        if (current.status === 'pending') {
          await scheduleExtractionJob(context.env, context.authHeader, current.id);
          startPendingExtraction(context, current.id);
        }
        resumable.push(current);
      }
      return json({ jobs: resumable.map(publicExtractionJob) }, 200, context.headers);
    }
    const jobId = path.split('/')[4] || '';
    let job = await getExtractionJob(context.env, context.authHeader, jobId);
    if (!job) return json({ error: 'Extraction job not found' }, 404, context.headers);
    job = await restartExpiredJob(context.env, context.authHeader, job);
    if (job.status === 'pending') {
      await scheduleExtractionJob(context.env, context.authHeader, job.id);
      startPendingExtraction(context, job.id);
    }
    return json(publicExtractionJob(job), 200, context.headers);
  }

  const segments = path.split('/');
  if (segments.length === 6 && context.request.method === 'POST') {
    const jobId = segments[4] || '';
    const control = segments[5] as ExtractionJobControl;
    if (!controls.has(control)) return json({ error: 'Unsupported job control' }, 400, context.headers);
    const job = await controlExtractionJob(context.env, context.authHeader, jobId, control);
    if (!job) return json({ error: 'Extraction job not found' }, 404, context.headers);
    if (job.status === 'pending') {
      await scheduleExtractionJob(context.env, context.authHeader, job.id);
      startPendingExtraction(context, job.id);
    }
    return json(publicExtractionJob(job), 200, context.headers);
  }

  if (context.request.method !== 'POST' || path !== '/api/ai/extraction-jobs') {
    return json({ error: 'Method not allowed' }, 405, context.headers);
  }
  const body = await context.request.json() as Record<string, unknown>;
  const extractionMode = body.extractionMode === 'generate' ? 'generate' as const : 'literal' as const;
  const input = {
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '',
    fileStoragePath: typeof body.fileStoragePath === 'string' ? body.fileStoragePath : '',
    mimeType: typeof body.mimeType === 'string' ? body.mimeType : '',
    sourceFileName: typeof body.sourceFileName === 'string' ? body.sourceFileName.slice(0, 255) : undefined,
    extractionMode,
    customInstruction: typeof body.customInstruction === 'string' ? body.customInstruction : undefined,
    requestedQuestionCount: extractionMode === 'generate' && Number.isInteger(body.requestedQuestionCount) && Number(body.requestedQuestionCount) > 0 ? Number(body.requestedQuestionCount) : undefined,
  };
  const validationError = validateCreateExtractionJobInput(input, context.userId);
  if (validationError) return json({ error: 'Invalid extraction job request' }, 400, context.headers);

  let job = await createOrGetExtractionJob(context.env, context.authHeader, context.userId, input);
  let taskId: string | undefined;
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
  if (job.status === 'pending') {
    await scheduleExtractionJob(context.env, context.authHeader, job.id, taskId);
    startPendingExtraction(context, job.id);
  }
  return json({ job: publicExtractionJob(job) }, 202, context.headers);
}
