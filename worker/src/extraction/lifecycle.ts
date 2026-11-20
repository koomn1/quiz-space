import { PDFDocument } from 'pdf-lib';
import type {
  CreateExtractionJobInput,
  ExtractionJobChunkRow,
  ExtractionJobControl,
  ExtractionJobEnv,
  ExtractionJobRow,
} from './types';
import { extractionPrompt, parseAllowedQuestionTypes } from './prompts';
import {
  deriveQuizTitle,
  normalizeQuestions,
  questionFingerprint,
  sourceFileBaseName,
} from './schemas';
import {
  apiUrl,
  databaseHeaders,
  deleteSourceFile,
  downloadSourceFile,
  isSafeStoragePath,
} from './storage';
import {
  base64FromBytes,
  buildVisionChunkRanges,
  getScannedPdfPageCount,
  selectVisionChunkPlan,
  visionChunkRetryDelaySeconds,
  MAX_VISION_CHUNK_DELIVERY_ATTEMPTS,
  VISION_CHUNK_PAGE_COUNT,
} from './visionChunking';
import {
  AI_VISION_FALLBACKS,
  callAiWithFallback,
  extractJobQuiz,
  parseJson,
} from './aiPipeline';

export const LEASE_MS = 5 * 60 * 1000;

export function cleanMessage(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value || '');
  if (/no extractable text|no valid questions|did not contain any valid/i.test(text)) {
    return 'لم يتم العثور على أسئلة واضحة في الملف المرفوع.';
  }
  if (/protected|password/i.test(text)) {
    return 'الملف محمي أو لا يمكن قراءته. أزل كلمة المرور ثم أعد المحاولة.';
  }
  return 'تعذر إكمال استخراج الأسئلة من الملف. تأكد من أن الملف سليم ثم أعد المحاولة.';
}

/**
 * Admin-only diagnostics. Keep provider/status details, but never persist
 * common personal or credential-like values in the monitoring table.
 */
export function technicalErrorMessage(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value || '');
  const redacted = text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [token]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[id]')
    .replace(/(?:https?:\/\/|\/)[^\s"']+\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g|webp)(?:\?[^\s"']*)?/gi, '[file]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 480);
  return redacted || 'Unknown extraction error';
}

export async function createOrGetExtractionJob(
  env: ExtractionJobEnv,
  authHeader: string,
  userId: string,
  input: CreateExtractionJobInput,
): Promise<ExtractionJobRow> {
  const existingResponse = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?user_id=eq.${encodeURIComponent(userId)}&idempotency_key=eq.${encodeURIComponent(input.idempotencyKey)}&select=*`), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!existingResponse.ok) throw new Error(`Job lookup failed: ${existingResponse.status}`);
  const existingRows = await existingResponse.json() as ExtractionJobRow[];
  if (existingRows[0]) return existingRows[0];

  const createResponse = await fetch(apiUrl(env, '/rest/v1/extraction_jobs'), {
    method: 'POST',
    headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({
      user_id: userId,
      idempotency_key: input.idempotencyKey,
      file_storage_path: input.fileStoragePath,
      file_mime_type: input.mimeType,
      extraction_mode: input.extractionMode,
      source_file_name: input.sourceFileName?.trim().slice(0, 255) || null,
      custom_instruction: input.customInstruction?.trim() || null,
      requested_question_count: input.requestedQuestionCount || null,
      progress_message: 'تم استلام الملف وتجهيز مهمة الاستخراج.',
    }),
  });
  if (createResponse.ok) {
    const rows = await createResponse.json() as ExtractionJobRow[];
    if (rows[0]) return rows[0];
  }
  if (createResponse.status === 409) {
    const raced = await fetchJobByIdempotency(env, authHeader, userId, input.idempotencyKey);
    if (raced) return raced;
  }
  throw new Error(`Job creation failed: ${createResponse.status}`);
}

export async function fetchJobByIdempotency(env: ExtractionJobEnv, authHeader: string, userId: string, key: string): Promise<ExtractionJobRow | null> {
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?user_id=eq.${encodeURIComponent(userId)}&idempotency_key=eq.${encodeURIComponent(key)}&select=*`), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) return null;
  const rows = await response.json() as ExtractionJobRow[];
  return rows[0] || null;
}

export async function claimPendingJob(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<{ job: ExtractionJobRow; token: string } | null> {
  const token = crypto.randomUUID();
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?id=eq.${encodeURIComponent(jobId)}&status=eq.pending`), {
    method: 'PATCH',
    headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({
      status: 'processing',
      processing_token: token,
      processing_started_at: new Date().toISOString(),
      processing_lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString(),
      progress_percentage: 1,
      progress_message: 'جارٍ تجهيز الملف للاستخراج.',
      error_message: null,
    }),
  });
  if (!response.ok) throw new Error(`Job claim failed: ${response.status}`);
  const rows = await response.json() as ExtractionJobRow[];
  return rows[0] ? { job: rows[0], token } : null;
}

export async function restartExpiredJob(env: ExtractionJobEnv, authHeader: string, job: ExtractionJobRow): Promise<ExtractionJobRow> {
  const leaseExpiry = job.processing_lease_expires_at ? new Date(job.processing_lease_expires_at).getTime() : 0;
  if (job.status !== 'processing' || Number.isNaN(leaseExpiry) || leaseExpiry > Date.now()) return job;
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.processing&processing_lease_expires_at=lt.${encodeURIComponent(new Date().toISOString())}`), {
    method: 'PATCH',
    headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({
      status: 'pending',
      processing_token: null,
      processing_lease_expires_at: null,
      progress_message: 'استؤنفت مهمة الاستخراج بعد انقطاع قصير.',
    }),
  });
  if (!response.ok) return job;
  const rows = await response.json() as ExtractionJobRow[];
  return rows[0] || job;
}

export async function fetchJob(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<ExtractionJobRow | null> {
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) throw new Error(`Job read failed: ${response.status}`);
  const rows = await response.json() as ExtractionJobRow[];
  return rows[0] || null;
}

export async function fetchJobChunks(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<ExtractionJobChunkRow[]> {
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_job_chunks?parent_job_id=eq.${encodeURIComponent(jobId)}&order=chunk_index.asc&select=*`), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) throw new Error(`Chunk read failed: ${response.status}`);
  return response.json() as Promise<ExtractionJobChunkRow[]>;
}

export async function updateClaimedJob(
  env: ExtractionJobEnv,
  authHeader: string,
  jobId: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?id=eq.${encodeURIComponent(jobId)}&processing_token=eq.${encodeURIComponent(token)}`), {
    method: 'PATCH',
    headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({
      ...payload,
      processing_lease_expires_at: payload.status === 'complete' || payload.status === 'error'
        ? null
        : new Date(Date.now() + LEASE_MS).toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Job update failed: ${response.status}`);
  return true;
}

export function startJobLeaseHeartbeat(
  env: ExtractionJobEnv,
  authHeader: string,
  jobId: string,
  token: string,
): () => void {
  const interval = setInterval(() => {
    void updateClaimedJob(env, authHeader, jobId, token, {}).catch((error) => {
      console.warn('Extraction job lease heartbeat failed.', { jobId, error });
    });
  }, Math.min(60_000, Math.floor(LEASE_MS / 3)));
  return () => clearInterval(interval);
}

export async function createVisionChunks(
  env: ExtractionJobEnv,
  authHeader: string,
  jobId: string,
  pageCount: number,
  pageCountPerChunk = VISION_CHUNK_PAGE_COUNT,
): Promise<ExtractionJobChunkRow[]> {
  const chunks = buildVisionChunkRanges(pageCount, pageCountPerChunk).map(({ chunkIndex, pageStart, pageEnd }) => ({
    parent_job_id: jobId,
    chunk_index: chunkIndex,
    page_start: pageStart,
    page_end: pageEnd,
  }));
  if (!chunks.length) throw new Error('The PDF did not contain any pages.');
  const response = await fetch(apiUrl(env, '/rest/v1/extraction_job_chunks'), {
    method: 'POST',
    headers: databaseHeaders(env, authHeader, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    }),
    body: JSON.stringify(chunks),
  });
  if (!response.ok) throw new Error(`Chunk creation failed: ${response.status}`);
  const created = await response.json() as ExtractionJobChunkRow[];
  return created.length ? created : fetchJobChunks(env, authHeader, jobId);
}

export async function restartExpiredVisionChunks(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<void> {
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_job_chunks?parent_job_id=eq.${encodeURIComponent(jobId)}&status=eq.processing&processing_lease_expires_at=lt.${encodeURIComponent(new Date().toISOString())}`), {
    method: 'PATCH',
    headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({
      status: 'pending',
      processing_token: null,
      processing_lease_expires_at: null,
      error_message: null,
    }),
  });
  if (!response.ok) throw new Error(`Expired chunk recovery failed: ${response.status}`);
}

export async function logExtractionPerformance(
  env: ExtractionJobEnv,
  authHeader: string,
  job: ExtractionJobRow,
  provider: string,
  status: 'success' | 'error',
  latencyMs: number,
  chunks?: number,
  errorMessage?: unknown,
): Promise<void> {
  try {
    await fetch(apiUrl(env, '/rest/v1/ai_performance_logs'), {
      method: 'POST',
      headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        user_id: job.user_id,
        operation: 'extraction_job',
        provider,
        chunk_count: chunks,
        status,
        latency_ms: latencyMs,
        error_message: status === 'error' ? technicalErrorMessage(errorMessage) : null,
      }),
    });
  } catch (error) {
    console.warn('Extraction job telemetry write failed.', error);
  }
}

export async function claimPendingChunk(
  env: ExtractionJobEnv,
  authHeader: string,
  jobId: string,
  chunkId: string,
): Promise<{ chunk: ExtractionJobChunkRow; token: string } | null> {
  const token = crypto.randomUUID();
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_job_chunks?id=eq.${encodeURIComponent(chunkId)}&parent_job_id=eq.${encodeURIComponent(jobId)}&status=eq.pending`), {
    method: 'PATCH',
    headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({
      status: 'processing',
      processing_token: token,
      processing_lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString(),
      error_message: null,
    }),
  });
  if (!response.ok) throw new Error(`Chunk claim failed: ${response.status}`);
  const rows = await response.json() as ExtractionJobChunkRow[];
  return rows[0] ? { chunk: rows[0], token } : null;
}

export async function updateClaimedChunk(
  env: ExtractionJobEnv,
  authHeader: string,
  jobId: string,
  chunkId: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_job_chunks?id=eq.${encodeURIComponent(chunkId)}&parent_job_id=eq.${encodeURIComponent(jobId)}&processing_token=eq.${encodeURIComponent(token)}`), {
    method: 'PATCH',
    headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({
      ...payload,
      processing_lease_expires_at: payload.status === 'complete' || payload.status === 'error' || payload.status === 'pending'
        ? null
        : new Date(Date.now() + LEASE_MS).toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Chunk update failed: ${response.status}`);
  return true;
}

export async function reconcileVisionParentJob(
  env: ExtractionJobEnv,
  authHeader: string,
  parent: ExtractionJobRow,
  parentToken: string,
  startedAt: number,
): Promise<void> {
  const chunks = await fetchJobChunks(env, authHeader, parent.id);
  const completed = chunks.filter(chunk => chunk.status === 'complete');
  const failed = chunks.filter(chunk => chunk.status === 'error');
  const total = chunks.length;
  if (!total) throw new Error('No persisted PDF chunks were found.');

  if (failed.length) {
    await updateClaimedJob(env, authHeader, parent.id, parentToken, {
      status: 'error',
      processed_chunks: completed.length,
      total_chunks: total,
      progress_percentage: Math.max(8, Math.round(5 + (completed.length / total) * 90)),
      progress_message: 'تعذر استخراج أحد أجزاء الملف الممسوح.',
      error_message: cleanMessage(failed[0].error_message),
      processing_token: null,
      processing_lease_expires_at: null,
    });
    await logExtractionPerformance(env, authHeader, parent, 'xkiro', 'error', Date.now() - startedAt, total, failed[0].error_message);
    return;
  }

  if (completed.length < total) {
    const allowedTypes = parseAllowedQuestionTypes(parent.custom_instruction);
    const partialQuestions = normalizeQuestions(completed.flatMap(chunk => normalizeQuestions(chunk.questions_json, allowedTypes)), allowedTypes);
    const extractedCount = partialQuestions.length;
    const percentage = Math.max(8, Math.min(95, Math.round(5 + (completed.length / total) * 90)));
    await updateClaimedJob(env, authHeader, parent.id, parentToken, {
      processed_chunks: completed.length,
      total_chunks: total,
      progress_percentage: percentage,
      progress_message: `معالجة الجزء ${completed.length}/${total} واستخراج ${extractedCount} سؤالاً.`,
      questions_json: partialQuestions,
    });
    return;
  }

  const allowedTypes = parseAllowedQuestionTypes(parent.custom_instruction);
  const questions = normalizeQuestions(completed.flatMap(chunk => normalizeQuestions(chunk.questions_json, allowedTypes)), allowedTypes);
  if (!questions.length) {
    await updateClaimedJob(env, authHeader, parent.id, parentToken, {
      status: 'error',
      processed_chunks: total,
      total_chunks: total,
      progress_message: 'لم تُستخرج أسئلة صالحة من الملف الممسوح.',
      error_message: 'لم يتم العثور على أسئلة واضحة في الملف المرفوع.',
      processing_token: null,
      processing_lease_expires_at: null,
    });
    await logExtractionPerformance(env, authHeader, parent, 'xkiro', 'error', Date.now() - startedAt, total, 'لم يتم العثور على أسئلة واضحة من الأجزاء المعالجة.');
    return;
  }

  const providers = [...new Set(completed.map(chunk => chunk.provider).filter(Boolean))].join(', ') || 'xkiro';
  await updateClaimedJob(env, authHeader, parent.id, parentToken, {
    status: 'complete',
    progress_percentage: 100,
    processed_chunks: total,
    total_chunks: total,
    progress_message: `اكتمل الاستخراج: ${questions.length} سؤالاً جاهزاً للمراجعة.`,
    questions_json: questions,
    quiz_title: deriveQuizTitle(parent.source_file_name),
    quiz_description: `أسئلة مستخرجة من محتوى ${sourceFileBaseName(parent.source_file_name) || 'الملف الممسوح ضوئيًا'}.`,
    provider: providers,
    completed_at: new Date().toISOString(),
    processing_token: null,
    processing_lease_expires_at: null,
  });
  await logExtractionPerformance(env, authHeader, parent, providers, 'success', Date.now() - startedAt, total);
  if (isSafeStoragePath(parent.file_storage_path, parent.user_id)) {
    await deleteSourceFile(env, authHeader, parent.file_storage_path);
  }
}

export async function controlExtractionJob(
  env: ExtractionJobEnv,
  authHeader: string,
  jobId: string,
  control: ExtractionJobControl,
): Promise<ExtractionJobRow | null> {
  const job = await fetchJob(env, authHeader, jobId);
  if (!job) return null;
  if (control === 'pause' && !['pending', 'processing'].includes(job.status)) return job;
  if (control === 'resume' && !['paused', 'error'].includes(job.status)) return job;
  if (control === 'cancel' && ['complete', 'cancelled'].includes(job.status)) return job;
  if (control === 'retry-failed' && job.status !== 'error') return job;

  if (control === 'retry-failed') {
    const resetChunks = await fetch(apiUrl(env, `/rest/v1/extraction_job_chunks?parent_job_id=eq.${encodeURIComponent(jobId)}&status=eq.error`), {
      method: 'PATCH',
      headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status: 'pending', processing_token: null, processing_lease_expires_at: null, error_message: null }),
    });
    if (!resetChunks.ok) throw new Error(`Failed chunks reset failed: ${resetChunks.status}`);
  }

  const nextStatus = control === 'pause' ? 'paused' : control === 'cancel' ? 'cancelled' : 'pending';
  const message = control === 'pause'
    ? 'تم إيقاف المهمة مؤقتاً بناءً على طلبك.'
    : control === 'cancel'
      ? 'تم إلغاء مهمة الاستخراج بناءً على طلبك.'
      : control === 'retry-failed'
        ? 'تمت إعادة الأجزاء الفاشلة إلى قائمة الانتظار.'
        : 'تم استئناف مهمة الاستخراج.';
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?id=eq.${encodeURIComponent(jobId)}`), {
    method: 'PATCH',
    headers: databaseHeaders(env, authHeader, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({
      status: nextStatus,
      processing_token: null,
      processing_lease_expires_at: null,
      error_message: control === 'retry-failed' || control === 'resume' ? null : job.error_message,
      progress_message: message,
    }),
  });
  if (!response.ok) throw new Error(`Job control failed: ${response.status}`);
  const rows = await response.json() as ExtractionJobRow[];
  return rows[0] || job;
}

export async function processExtractionJob(
  env: ExtractionJobEnv,
  authHeader: string,
  jobId: string,
  enqueueVisionChunks: (jobId: string, chunkIds: string[]) => Promise<void>,
): Promise<void> {
  const claimed = await claimPendingJob(env, authHeader, jobId);
  if (!claimed) return;
  const { job, token } = claimed;
  const startedAt = Date.now();
  const stopLeaseHeartbeat = startJobLeaseHeartbeat(env, authHeader, job.id, token);
  let provider = 'ai-provider';
  let chunks = 0;
  try {
    if (!isSafeStoragePath(job.file_storage_path, job.user_id)) {
      throw new Error('Invalid file storage path.');
    }
    const source = await downloadSourceFile(env, authHeader, job.file_storage_path, job.user_id);
    await updateClaimedJob(env, authHeader, job.id, token, {
      progress_percentage: 5,
      progress_message: `تم فتح ${job.source_file_name || 'المصدر'}، جارٍ فحص النوع واللغة والأدوات المناسبة للقراءة.`,
    });
    const scannedPageCount = await getScannedPdfPageCount(source, job);
    if (scannedPageCount) {
      await restartExpiredVisionChunks(env, authHeader, job.id);
      const existingChunks = await fetchJobChunks(env, authHeader, job.id);
      const plan = selectVisionChunkPlan(scannedPageCount, source.byteLength, Boolean(env.XKIRO_API_KEY));
      const visionChunks = existingChunks.length
        ? existingChunks
        : await createVisionChunks(env, authHeader, job.id, scannedPageCount, plan.pageCountPerChunk);
      const pendingChunkIds = visionChunks.filter(chunk => chunk.status === 'pending').map(chunk => chunk.id);
      await updateClaimedJob(env, authHeader, job.id, token, {
        processed_chunks: visionChunks.filter(chunk => chunk.status === 'complete').length,
        total_chunks: visionChunks.length,
        progress_percentage: 5,
        progress_message: `تم اكتشاف PDF مصور؛ جرى تجهيز ${visionChunks.length} أجزاء لتحليل الصفحات والصور والرسوم (${plan.pageCountPerChunk} صفحات للجزء).`,
      });
      if (pendingChunkIds.length) await enqueueVisionChunks(job.id, pendingChunkIds);
      return;
    }
    await updateClaimedJob(env, authHeader, job.id, token, {
      progress_percentage: 8,
      progress_message: job.extraction_mode === 'generate'
        ? 'تم فحص المصدر؛ جارٍ قراءة النص والجداول والرسوم ثم بناء أسئلة من كل جزء.'
        : 'تم فحص المصدر؛ جارٍ قراءة النص والأسئلة والجداول كما وردت في الملف.',
    });
    const result = await extractJobQuiz(source, job, env, async (processed, total, questionCount) => {
      chunks = total;
      const percentage = Math.max(8, Math.min(95, Math.round(5 + (processed / Math.max(total, 1)) * 90)));
      await updateClaimedJob(env, authHeader, job.id, token, {
        processed_chunks: processed,
        total_chunks: total,
        progress_percentage: percentage,
        progress_message: job.extraction_mode === 'generate'
          ? `قراءة وتحليل الجزء ${processed}/${total} من المصدر ثم بناء ${questionCount} سؤالاً موثقاً منه.`
          : `قراءة الجزء ${processed}/${total} واستخراج ${questionCount} سؤالاً كما ورد في المصدر.`,
      });
    });
    provider = result.provider;
    chunks = result.chunks;
    if (!result.questions.length) throw new Error('The document did not contain any valid questions.');
    await updateClaimedJob(env, authHeader, job.id, token, {
      status: 'complete',
      progress_percentage: 100,
      processed_chunks: result.chunks,
      total_chunks: result.chunks,
      progress_message: job.extraction_mode === 'generate'
        ? `اكتمل تحليل المصدر وبناء ${result.questions.length} سؤالاً مرتبة بالإجابة والشرح.`
        : `اكتمل استخراج ${result.questions.length} سؤالاً جاهزاً للمراجعة.`,
      questions_json: result.questions,
      quiz_title: result.title,
      quiz_description: result.description,
      provider: result.provider,
      completed_at: new Date().toISOString(),
      processing_token: null,
      processing_lease_expires_at: null,
    });
    await logExtractionPerformance(env, authHeader, job, result.provider, 'success', Date.now() - startedAt, result.chunks);
    if (isSafeStoragePath(job.file_storage_path, job.user_id)) {
      await deleteSourceFile(env, authHeader, job.file_storage_path);
    }
  } catch (error) {
    console.error('Extraction job failed.', { jobId: job.id, error });
    try {
      await updateClaimedJob(env, authHeader, job.id, token, {
        status: 'error',
        progress_message: 'توقفت المهمة قبل اكتمال الاستخراج.',
        error_message: cleanMessage(error),
        processing_token: null,
        processing_lease_expires_at: null,
      });
    } catch (updateError) {
      console.error('Extraction job error state update failed.', { jobId: job.id, updateError });
    }
    await logExtractionPerformance(env, authHeader, job, provider, 'error', Date.now() - startedAt, chunks, error);
  } finally {
    stopLeaseHeartbeat();
  }
}

export async function processExtractionJobChunk(
  env: ExtractionJobEnv,
  authHeader: string,
  jobId: string,
  chunkId: string,
  deliveryAttempts: number,
): Promise<'complete' | 'retry'> {
  const parent = await fetchJob(env, authHeader, jobId);
  if (!parent || parent.status !== 'processing' || !parent.processing_token) return 'complete';
  const claimed = await claimPendingChunk(env, authHeader, jobId, chunkId);
  if (!claimed) return 'complete';
  const { chunk, token } = claimed;
  const startedAt = Date.now();
  try {
    if (!isSafeStoragePath(parent.file_storage_path, parent.user_id)) {
      throw new Error('Invalid file storage path.');
    }
    const source = await downloadSourceFile(env, authHeader, parent.file_storage_path, parent.user_id);
    if (parent.file_mime_type !== 'application/pdf') throw new Error('Vision chunks are supported only for PDF uploads.');
    const sourcePdf = await PDFDocument.load(source);
    if (chunk.page_end > sourcePdf.getPageCount()) throw new Error('The PDF page range is invalid.');
    const chunkPdf = await PDFDocument.create();
    const pages = await chunkPdf.copyPages(sourcePdf, Array.from(
      { length: chunk.page_end - chunk.page_start + 1 },
      (_, offset) => chunk.page_start - 1 + offset,
    ));
    pages.forEach(page => chunkPdf.addPage(page));
    const request = await callAiWithFallback(env, [{
      role: 'user',
      content: [
        { type: 'text', text: extractionPrompt(parent.custom_instruction) },
        {
          type: 'file',
          file: {
            filename: `pages-${chunk.page_start}-${chunk.page_end}.pdf`,
            file_data: `data:application/pdf;base64,${base64FromBytes(new Uint8Array(await chunkPdf.save()))}`,
          },
        },
      ],
    }], AI_VISION_FALLBACKS);
    const questions = normalizeQuestions(parseJson(request.text), parseAllowedQuestionTypes(parent.custom_instruction)).map((question) => ({
      ...question,
      fingerprint: questionFingerprint(question),
      sourceDocumentId: parent.id,
      sourceChunkId: chunk.id,
      sourcePages: Array.from({ length: chunk.page_end - chunk.page_start + 1 }, (_, offset) => chunk.page_start + offset),
    }));
    if (!questions.length) throw new Error('The document did not contain any valid questions.');
    await updateClaimedChunk(env, authHeader, jobId, chunk.id, token, {
      status: 'complete',
      questions_json: questions,
      provider: request.model,
      completed_at: new Date().toISOString(),
      processing_token: null,
    });
    await reconcileVisionParentJob(env, authHeader, parent, parent.processing_token, startedAt);
    return 'complete';
  } catch (error) {
    console.error('Extraction job chunk failed.', { jobId, chunkId, error });
    if (deliveryAttempts < MAX_VISION_CHUNK_DELIVERY_ATTEMPTS) {
      const backoffSeconds = visionChunkRetryDelaySeconds(deliveryAttempts);
      await updateClaimedChunk(env, authHeader, jobId, chunk.id, token, {
        status: 'pending',
        processing_token: null,
        error_message: cleanMessage(error),
      });
      await updateClaimedJob(env, authHeader, parent.id, parent.processing_token, {
        progress_message: `تعذر إتمام جزء من الملف، ستتم إعادة المحاولة بعد ${backoffSeconds} ثانية (${deliveryAttempts}/${MAX_VISION_CHUNK_DELIVERY_ATTEMPTS}).`,
      });
      return 'retry';
    }
    await updateClaimedChunk(env, authHeader, jobId, chunk.id, token, {
      status: 'error',
      processing_token: null,
      error_message: cleanMessage(error),
    });
    await reconcileVisionParentJob(env, authHeader, parent, parent.processing_token, startedAt);
    return 'complete';
  }
}

export async function getExtractionJob(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<ExtractionJobRow | null> {
  return fetchJob(env, authHeader, jobId);
}

export async function listActiveExtractionJobs(env: ExtractionJobEnv, authHeader: string): Promise<ExtractionJobRow[]> {
  const response = await fetch(apiUrl(env, '/rest/v1/extraction_jobs?status=in.(pending,processing,paused,error)&order=created_at.desc&limit=10&select=*'), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) throw new Error(`Active job read failed: ${response.status}`);
  return response.json() as Promise<ExtractionJobRow[]>;
}
