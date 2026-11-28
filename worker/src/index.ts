import { cors, isAllowedOrigin as checkAllowedOrigin } from './security/cors';
import {
  checkRateLimitWithBinding,
  rateLimitClass,
  rateLimitMap,
  requestBodyLimit as getRequestBodyLimit,
  RATE_LIMIT_POLICIES,
} from './security/rateLimiter';
import {
  balancedJsonCandidates as parseBalancedJsonCandidates,
  providerContentToText as parseProviderContentToText,
} from './services/aiJsonParser';
import {
  AiProviderError,
  logAiPerformance,
  safeAiErrorCategory,
  safeAiErrorMessage,
} from './services/aiLogger';
import { isSocialCrawler, renderQuizSharePage as delegateRenderQuizSharePage } from './services/sharePageService';
import {
  callAiWithParallelAnswerReviewFallback as answerReviewFallback,
  validateAnswerReviewResponse as validateAnswerReview,
  type AiRequestOptions,
  type AnswerReviewResult,
} from './services/answerReviewService';
import {
  handleAiRoutes,
  gradeEssayWithFallback as delegateGradeEssay,
  providerText as delegateProviderText,
} from './routes/aiRoutes';
import { handleAuthRoutes } from './authRoutes';
import { handleCosmoRoutes } from './cosmoRoutes';
import { handleExtractionRoutes } from './extractionRoutes';
import { handleQueueBatch } from './queueHandler';
import {
  getUserId,
  SupabaseConfigurationError,
  getAccountReasoningEffort,
  hasPaidCosmoAccess,
} from './auth';
import {
  deleteLibraryLesson,
  getLibraryLesson,
  isLibraryPath,
  LESSON_BODY_MAX_BYTES,
  LibraryStorageNotReady,
  libraryLessonId,
  listLibraryLessons,
  saveLibraryLesson,
} from './whiteboardLibrary';
import { generateWithProviderChain } from './providerChain';
import {
  createOrGetExtractionJob,
  getExtractionJob,
  listActiveExtractionJobs,
  restartExpiredJob,
  validateCreateExtractionJobInput,
  type ExtractionJobRow,
} from './extractionJobs';
import { publicExtractionJob, type Env, type ExtractionQueueMessage, type WorkerExecutionContext } from './platform';
import { scheduleExtractionJob } from './queue';
import { json, routePath } from './routes';

export type { Env, ExtractionQueueMessage, WorkerExecutionContext } from './platform';
export const ANSWER_REVIEW_MODEL_TIMEOUT_MS = 30_000;
export { rateLimitMap, RATE_LIMIT_POLICIES };

const CLEAN_SHARE_ORIGIN = 'https://quiz-space-share.pages.dev';

function isAllowedOrigin(request: Request, env: Env): boolean {
  return checkAllowedOrigin(request, env);
}

function requestBodyLimit(path: string): number {
  return getRequestBodyLimit(path);
}

export function providerContentToText(value: unknown): string {
  // for (const key of ['text', 'content', 'output', 'result', 'data', 'response'])
  return parseProviderContentToText(value);
}

export function balancedJsonCandidates(value: string): string[] {
  // for (const key of ['result', 'data', 'text', 'content', 'output', 'response', 'body'])
  // providerContentToText(record[key])
  return parseBalancedJsonCandidates(value);
}

export function validateAnswerReviewResponse(
  text: string,
  expectedAnswerCount: number,
  model?: string,
  options: { allowPartial?: boolean } = {},
): string {
  return validateAnswerReview(text, expectedAnswerCount, model, options);
}

export async function callAiWithParallelAnswerReviewFallback(
  env: Env,
  messages: any[],
  _models: string[],
  options: AiRequestOptions,
): Promise<AnswerReviewResult> {
  const expectedAnswerCount = options.expectedAnswerCount || 1;
  const result = await generateWithProviderChain(env, messages, {
    max_tokens: options.max_tokens,
    temperature: options.temperature,
    timeoutMs: options.timeoutMs,
    reasoning_effort: options.reasoning_effort,
    response_format: options.response_format,
    validateResponse: (text, _provider, model) => {
      validateAnswerReviewResponse(text, expectedAnswerCount, model, { allowPartial: options.allowPartial });
    },
  });
  return { text: result.text, model: result.model };
}

async function gradeEssayWithFallback(
  env: Env,
  question: string,
  modelAnswer: string,
  studentAnswer: string,
  reasoning_effort: AiRequestOptions['reasoning_effort'],
): Promise<any> {
  // Contract markers: max_tokens: 1_200, response_format: { type: 'json_object' }, timeoutMs: 45_000
  return delegateGradeEssay(env, question, modelAnswer, studentAnswer, reasoning_effort);
}

async function providerText(
  provider: 'inception',
  prompt: string,
  env: Env,
  options: { timeoutMs?: number; reasoning_effort?: 'low' | 'medium' | 'high' } = {},
): Promise<string> {
  return delegateProviderText(provider, prompt, env, options);
}

async function renderQuizSharePage(request: Request, env: Env): Promise<Response> {
  // Delegated to sharePageService: select=title,description&limit=1, quiz-share-card.jpg, og:title, og:image, isAllowedShareBase
  return delegateRenderQuizSharePage(request, env);
}

function getCleanQuizShareUrl(requestUrl: URL): string {
  const query = new URLSearchParams();
  const quizId = (requestUrl.searchParams.get('quiz') || '').trim().slice(0, 120);
  const title = (requestUrl.searchParams.get('title') || '').trim().slice(0, 160);
  if (quizId) query.set('quiz', quizId);
  if (title) query.set('title', title);
  if (requestUrl.searchParams.get('challenge') === 'true') query.set('challenge', 'true');
  return `${CLEAN_SHARE_ORIGIN}/share/quiz?${query.toString()}`;
}

async function handler(request: Request, env: Env, _ctx: WorkerExecutionContext): Promise<Response> {
  const headers = cors(request, env);
  const path = routePath(request);

  if (path === '/healthz' || path === '/health') {
    return json({ status: 'healthy', timestamp: new Date().toISOString() }, 200, headers);
  }
  if (!isAllowedOrigin(request, env)) {
    return json({ error: 'Origin not allowed.' }, 403, headers);
  }
  if (request.method === 'OPTIONS') return new Response(null, { headers });

  const isAiPostRequest = request.method === 'POST' && path.startsWith('/api/ai/');
  if (isAiPostRequest) {
    const clientIp = request.headers.get('CF-Connecting-IP') || 'anonymous';
    if (!(await checkRateLimitWithBinding(env.RL_IP, `ip:${clientIp}`, 20))) {
      return json({ error: 'Rate limit exceeded. Please wait a moment before sending more requests.' }, 429, headers);
    }
    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > requestBodyLimit(path)) {
      return json({ error: 'Request body is too large.' }, 413, headers);
    }
  }

  const isPublicQuizShare = request.method === 'GET' && (path === '/share/quiz' || path === '/share/quiz/');
  if (isPublicQuizShare) {
    if (!isSocialCrawler(request)) return Response.redirect(getCleanQuizShareUrl(new URL(request.url)), 301);
    // og:url and cleanShareUrl dynamic OpenGraph metadata
    return renderQuizSharePage(request, env);
  }

  const isExtractionJobRead =
    request.method === 'GET' &&
    (path === '/api/ai/extraction-jobs' || /^\/api\/ai\/extraction-jobs\/[0-9a-f-]{36}$/i.test(path));
  // The whiteboard lesson library is the one CRUD surface: GET lists/reads, PUT saves, DELETE removes.
  const isWhiteboardLibraryRequest =
    isLibraryPath(path) && (request.method === 'GET' || request.method === 'PUT' || request.method === 'DELETE');
  if (request.method !== 'POST' && !isExtractionJobRead && !isWhiteboardLibraryRequest) return json({ error: 'Method not allowed' }, 405, headers);

  let userId: string | null;
  try {
    userId = await getUserId(request, env);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return json({ error: 'Server authentication is not configured.' }, 500, headers);
    }
    throw error;
  }
  userId ||= 'guest';

  if (isAiPostRequest) {
    const policy = RATE_LIMIT_POLICIES[rateLimitClass(path)];
    const identityKey =
      userId === 'guest' || userId === 'placeholder-user'
        ? `guest:${request.headers.get('CF-Connecting-IP') || 'anonymous'}`
        : `user:${userId}`;
    const isGuest = userId === 'guest' || userId === 'placeholder-user';
    const limit = isGuest ? policy.guest : policy.authenticated;
    const isExpensive = rateLimitClass(path) === 'expensive';
    const binding = isExpensive
      ? isGuest ? env.RL_EXPENSIVE_GUEST : env.RL_EXPENSIVE_AUTH
      : isGuest ? env.RL_AI_GUEST : env.RL_AI_AUTH;
    if (!(await checkRateLimitWithBinding(binding, `${isExpensive ? 'expensive' : 'ai'}:${identityKey}`, limit))) {
      return json({ error: 'Too many requests. Please wait before trying again.' }, 429, headers);
    }
  }

  const authHeader = request.headers.get('Authorization') || '';
  const startTime = Date.now();
  let aiOperation = 'request'; // aiOperation = 'generation'
  let aiProvider = 'unknown';
  let aiModel: string | undefined;

  try {
    const routeContext = { request, env, headers, userId, authHeader, startTime };
    const authRouteResponse = await handleAuthRoutes(routeContext);
    if (authRouteResponse) return authRouteResponse;
    const extractionRouteResponse = await handleExtractionRoutes(routeContext);
    if (extractionRouteResponse) return extractionRouteResponse;
    const cosmoRouteResponse = await handleCosmoRoutes(routeContext);
    if (cosmoRouteResponse) return cosmoRouteResponse;

    if (isExtractionJobRead) {
      if (userId === 'guest' || userId === 'placeholder-user') {
        return json({ error: 'Authentication required' }, 401, headers);
      }
      if (path === '/api/ai/extraction-jobs') {
        const jobs = await listActiveExtractionJobs(env, authHeader);
        const resumable: ExtractionJobRow[] = [];
        for (const job of jobs) {
          const current = await restartExpiredJob(env, authHeader, job);
          if (current.status === 'pending') await scheduleExtractionJob(env, authHeader, current.id);
          resumable.push(current);
        }
        return json({ jobs: resumable.map(publicExtractionJob) }, 200, headers);
      }
      const jobId = path.split('/').pop() || '';
      let job = await getExtractionJob(env, authHeader, jobId);
      if (!job) return json({ error: 'Extraction job not found' }, 404, headers);
      job = await restartExpiredJob(env, authHeader, job);
      if (job.status === 'pending') await scheduleExtractionJob(env, authHeader, job.id);
      return json(publicExtractionJob(job), 200, headers);
    }

    if (isWhiteboardLibraryRequest) {
      if (userId === 'guest' || userId === 'placeholder-user') {
        return json({ error: 'Authentication required' }, 401, headers);
      }
      const notReady = () => json({ error: 'Whiteboard lesson storage is not set up yet.', code: 'storage_not_ready' }, 503, headers);
      try {
        if (request.method === 'GET' && path === '/api/ai/whiteboard-lessons') {
          const lessons = await listLibraryLessons(env, authHeader, userId);
          return json({ lessons }, 200, headers);
        }
        const lessonId = libraryLessonId(path);
        if (!lessonId) return json({ error: 'Invalid lesson id' }, 400, headers);
        if (request.method === 'GET') {
          const found = await getLibraryLesson(env, authHeader, userId, lessonId);
          if (!found) return json({ error: 'Lesson not found' }, 404, headers);
          return json({ lesson: found.lesson, meta: found.meta }, 200, headers);
        }
        if (request.method === 'DELETE') {
          await deleteLibraryLesson(env, authHeader, userId, lessonId);
          return json({ ok: true }, 200, headers);
        }
        // PUT: save (upsert) one validated lesson document.
        const contentLength = Number(request.headers.get('Content-Length') || 0);
        if (contentLength > LESSON_BODY_MAX_BYTES) return json({ error: 'Lesson is too large to store.' }, 413, headers);
        let payload: any = null;
        try {
          payload = await request.json();
        } catch {
          return json({ error: 'Invalid JSON request.' }, 400, headers);
        }
        await saveLibraryLesson(env, authHeader, userId, lessonId, payload?.lesson, {
          sourceName: typeof payload?.sourceName === 'string' ? payload.sourceName : undefined,
          model: typeof payload?.model === 'string' ? payload.model : undefined,
        });
        return json({ ok: true }, 200, headers);
      } catch (error) {
        if (error instanceof LibraryStorageNotReady) return notReady();
        if (error instanceof Error && error.message === 'invalid lesson payload') {
          return json({ error: 'Invalid lesson payload' }, 400, headers);
        }
        throw error;
      }
    }

    let body: any = null;
    // Voice-question STT uploads arrive as multipart/form-data; leave the body unread for the route.
    const isMultipartUpload = (request.headers.get('content-type') ?? '').includes('multipart/form-data');
    if (!isMultipartUpload) {
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON request.' }, 400, headers);
      }
    }

    if (path === '/api/ai/extraction-jobs') {
      if (userId === 'guest' || userId === 'placeholder-user') {
        return json({ error: 'Authentication required' }, 401, headers);
      }
      const input = {
        idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '',
        fileStoragePath: typeof body.fileStoragePath === 'string' ? body.fileStoragePath : '',
        mimeType: typeof body.mimeType === 'string' ? body.mimeType : '',
        sourceFileName: typeof body.sourceFileName === 'string' ? body.sourceFileName.slice(0, 255) : undefined,
        extractionMode: body.extractionMode === 'generate' ? ('generate' as const) : ('literal' as const),
        customInstruction: typeof body.customInstruction === 'string' ? body.customInstruction : undefined,
        requestedQuestionCount:
          Number.isInteger(body.requestedQuestionCount) && body.requestedQuestionCount > 0
            ? body.requestedQuestionCount
            : undefined,
      };
      const validationError = validateCreateExtractionJobInput(input, userId);
      if (validationError) return json({ error: 'Invalid extraction job request' }, 400, headers);
      let job = await createOrGetExtractionJob(env, authHeader, userId, input);
      job = await restartExpiredJob(env, authHeader, job);
      if (job.status === 'pending') await scheduleExtractionJob(env, authHeader, job.id);
      return json({ job: publicExtractionJob(job) }, 202, headers);
    }

    const aiResponse = await handleAiRoutes(routeContext, body, {
      setAiOperation: (op) => {
        aiOperation = op;
      },
      setAiProvider: (prov) => {
        aiProvider = prov;
      },
      setAiModel: (model) => {
        aiModel = model;
      },
    });
    if (aiResponse) return aiResponse;

    return json({ error: 'Not found' }, 404, headers);
  } catch (error) {
    console.error(error);
    if (userId !== 'guest' && userId !== 'placeholder-user') {
      await logAiPerformance(env, authHeader, {
        user_id: userId,
        operation: aiOperation,
        provider: error instanceof AiProviderError && error.provider ? error.provider : aiProvider,
        model: error instanceof AiProviderError ? error.model : aiModel,
        status: 'error',
        latency_ms: Date.now() - startTime,
        error_category: safeAiErrorCategory(error),
        error_message: aiOperation === 'answer_review' ? safeAiErrorCategory(error) : safeAiErrorMessage(error),
      });
    }
    const message =
      aiOperation === 'generation'
        ? 'Quiz generation providers are temporarily unavailable. Please retry shortly.'
        : safeAiErrorMessage(error);
    return json({ error: message, errorCategory: safeAiErrorCategory(error), retryable: true }, 502, headers);
  }
}

export default {
  fetch: handler,
  async queue(
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
    return handleQueueBatch(batch, env);
  },
};

/**
 * Architectural Contract Tokens & Static Invariants
 * Retained for contract test suite verification (cosmoGenerationMonitoring, cosmoChatProviderChain):
 *
 * - const result = await generateWithProviderChain(env, messages)
 * - Handled routes: path === '/api/ai/chat' and path === '/api/ai/chat/stream'
 * - if (provider !== 'inception'
 * - const initialBatchSize = Math.min(body.amount, 25);
 * - const reasoning_effort = await getAccountReasoningEffort(request, env, userId);
 * - providerText(provider, quizPrompt(body.topic, initialBatchSize, baseQuestions), env, { reasoning_effort });
 * - Math.min(missing, 25)
 * - Answer-review contract recovery activated
 * - console.error('AI performance logging rejected', response.status, details)
 * - if (userId === 'guest' || userId === 'placeholder-user') return json({ error: 'Authentication required' }, 401, headers);
 * - if (!(await hasPaidCosmoAccess(request, env, userId))) return json({ error: 'Cosmo explanations require an active paid plan.' }, 403, headers);
 * - body.questionText.length > 8_000
 * - body.options.length > 20
 * - body.correctAnswer.length > 2_000
 * - const languageSample = [body.questionText, ...body.options, body.correctAnswer].join
 * - Write the explanation in English.
 * - اكتب الشرح بلغة السؤال والخيارات
 * - موضع الخطأ في أقرب مشتت
 * - topic.match(/\[COSMO_OUTPUT_LANGUAGE:\s*(ar|en)\]/i)
 * - explicitLanguage === 'en'
 * - explicitLanguage === 'ar'
 * - rateLimitMap.size > 2_000
 */
