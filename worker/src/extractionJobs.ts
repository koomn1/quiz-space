import mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { extractPdfTextContent, extractQuestionsFromText } from './documentExtraction';

export interface ExtractionJobEnv {
  OPENROUTER_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export interface ExtractionJobRow {
  id: string;
  user_id: string;
  idempotency_key: string;
  file_storage_path: string;
  file_mime_type: string;
  extraction_mode: 'literal' | 'generate';
  custom_instruction: string | null;
  requested_question_count: number | null;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress_percentage: number;
  processed_chunks: number;
  total_chunks: number | null;
  progress_message: string | null;
  questions_json: unknown[] | null;
  quiz_title: string | null;
  quiz_description: string | null;
  provider: string | null;
  error_message: string | null;
  processing_lease_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExtractionJobInput {
  idempotencyKey: string;
  fileStoragePath: string;
  mimeType: string;
  extractionMode: 'literal' | 'generate';
  customInstruction?: string;
  requestedQuestionCount?: number;
}

const BUCKET = 'quiz-extraction-uploads';
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const LEASE_MS = 2 * 60 * 1000;
const VISION_MODEL_TIMEOUT_MS = 20_000;
const TEXT_MODEL_FALLBACKS = [
  'qwen/qwen3-235b-a22b:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];
const VISION_MODEL_FALLBACKS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'google/gemma-4-26b-a4b-it:free',
];

const supportedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function apiUrl(env: ExtractionJobEnv, path: string): string {
  return `${env.SUPABASE_URL.replace(/\/$/, '')}${path}`;
}

function databaseHeaders(env: ExtractionJobEnv, authHeader: string, extra: HeadersInit = {}): HeadersInit {
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: authHeader,
    ...extra,
  };
}

function encodeStoragePath(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function isSafeStoragePath(path: string, userId: string): boolean {
  if (path.length < 3 || path.length > 512 || path.includes('..') || path.includes('\\')) return false;
  const parts = path.split('/');
  return parts.length >= 3 && parts[0] === userId && parts.every(Boolean);
}

function isValidIdempotencyKey(value: string): boolean {
  return /^[a-zA-Z0-9_-]{16,128}$/.test(value);
}

function cleanMessage(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value || '');
  if (/no extractable text|no valid questions|did not contain any valid/i.test(text)) {
    return 'لم يتم العثور على أسئلة واضحة في الملف المرفوع.';
  }
  if (/protected|password/i.test(text)) {
    return 'الملف محمي أو لا يمكن قراءته. أزل كلمة المرور ثم أعد المحاولة.';
  }
  return 'تعذر إكمال استخراج الأسئلة من الملف. تأكد من أن الملف سليم ثم أعد المحاولة.';
}

function extractionPrompt(customInstruction?: string | null): string {
  return `You are a lossless document extraction engine.
Extract EVERY question exactly as written.

Rules:
- Do not summarize or rewrite.
- Do not skip any question, including multiple choice, true/false, and essay/short answer questions.
- Preserve numbering and options (A/B/C/D) exactly.
- If a question starts on one page and continues on the next, merge it into one complete question.
- For Essay/Short answer questions, use type "essay" and leave options as an empty array [].
- Return JSON only in the following format:
{
  "title": "Quiz Title",
  "description": "Quiz Description",
  "questions": [
    {
      "number": 1,
      "text": "Question text...",
      "type": "mcq",
      "options": ["Option 1", "Option 2"],
      "correctIndex": 0,
      "correctAnswer": "The correct answer text",
      "explanation": "Brief explanation"
    }
  ]
}
${customInstruction?.trim() ? `Additional instructions: ${customInstruction.trim().slice(0, 2000)}` : ''}`;
}

function generatePrompt(amount: number, customInstruction?: string | null): string {
  return `استخرج أو أنشئ ${amount} سؤالاً فقط من محتوى الملف. حافظ على لغة المستند ومعلوماته ولا تخمّن أي معلومة غير موجودة. أعد JSON فقط بالشكل: {"title":"","description":"","questions":[{"number":1,"text":"","type":"mcq","options":[],"correctIndex":-1,"correctAnswer":"","explanation":""}]}.${customInstruction?.trim() ? ` تعليمات إضافية: ${customInstruction.trim().slice(0, 2000)}` : ''}`;
}

function parseJson(text: string): any {
  let cleaned = text.trim();
  const objectStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');
  const starts = [objectStart, arrayStart].filter(index => index >= 0);
  if (starts.length) cleaned = cleaned.slice(Math.min(...starts));
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3).trimEnd();
  return JSON.parse(cleaned);
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.byteLength; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function normalizeQuestions(value: unknown): any[] {
  const source = Array.isArray(value) ? value : Array.isArray((value as any)?.questions) ? (value as any).questions : [];
  const seen = new Set<string>();
  const questions: any[] = [];
  for (const raw of source) {
    if (!raw || typeof raw !== 'object') continue;
    const text = String((raw as any).text ?? (raw as any).question ?? '').trim();
    if (!text) continue;
    const key = text.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const declaredType = String((raw as any).type || '').toLowerCase();
    const type = declaredType === 'tf' || declaredType === 'true_false' || declaredType === 'true/false'
      ? 'tf'
      : declaredType === 'essay' || declaredType === 'short_answer' || declaredType === 'open'
        ? 'essay'
        : 'mcq';
    const options = Array.isArray((raw as any).options)
      ? (raw as any).options.map((option: unknown) => String(option ?? '').trim()).filter(Boolean)
      : [];
    questions.push({
      number: Number.isInteger(Number((raw as any).number)) && Number((raw as any).number) > 0 ? Number((raw as any).number) : questions.length + 1,
      text,
      type,
      options: type === 'essay' ? [] : options,
      correctIndex: Number.isInteger((raw as any).correctIndex) ? (raw as any).correctIndex : -1,
      correctAnswer: (raw as any).correctAnswer == null ? '' : String((raw as any).correctAnswer),
      explanation: (raw as any).explanation == null ? '' : String((raw as any).explanation),
    });
  }
  return questions;
}

async function callOpenRouterWithFallback(env: ExtractionJobEnv, messages: any[], models: string[]): Promise<{ text: string; model: string }> {
  let lastError: unknown;
  for (const model of models) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), VISION_MODEL_TIMEOUT_MS);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://koomn1.github.io/quiz-space/',
          'X-Title': 'QuizSpace',
        },
        body: JSON.stringify({ model, messages }),
      });
      if (!response.ok) throw new Error(`OpenRouter ${model} failed: ${response.status}`);
      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error(`OpenRouter ${model} returned an empty response`);
      return { text, model };
    } catch (error) {
      lastError = error;
      console.warn(`Extraction job model ${model} failed; trying fallback.`, error);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All extraction models failed.');
}

async function fetchJob(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<ExtractionJobRow | null> {
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) throw new Error(`Job read failed: ${response.status}`);
  const rows = await response.json() as ExtractionJobRow[];
  return rows[0] || null;
}

async function updateClaimedJob(
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
      processing_lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Job update failed: ${response.status}`);
  return true;
}

async function downloadSourceFile(env: ExtractionJobEnv, authHeader: string, path: string): Promise<Uint8Array> {
  const response = await fetch(apiUrl(env, `/storage/v1/object/authenticated/${BUCKET}/${encodeStoragePath(path)}`), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) throw new Error(response.status === 404 ? 'Source upload is no longer available.' : `Source download failed: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  if (!arrayBuffer.byteLength || arrayBuffer.byteLength > MAX_SOURCE_BYTES) throw new Error('Source file exceeds the processing limit.');
  return new Uint8Array(arrayBuffer);
}

async function deleteSourceFile(env: ExtractionJobEnv, authHeader: string, path: string): Promise<void> {
  try {
    await fetch(apiUrl(env, `/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`), {
      method: 'DELETE',
      headers: databaseHeaders(env, authHeader),
    });
  } catch (error) {
    console.warn('Extraction source cleanup failed.', error);
  }
}

async function logExtractionPerformance(env: ExtractionJobEnv, authHeader: string, job: ExtractionJobRow, provider: string, status: 'success' | 'error', latencyMs: number, chunks?: number): Promise<void> {
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
      }),
    });
  } catch (error) {
    console.warn('Extraction job telemetry write failed.', error);
  }
}

async function extractPdfVision(
  source: Uint8Array,
  job: ExtractionJobRow,
  env: ExtractionJobEnv,
  onProgress: (processed: number, total: number, questionCount: number) => Promise<void>,
): Promise<{ title: string; description: string; questions: any[]; provider: string; chunks: number }> {
  const pdf = await PDFDocument.load(source);
  const chunkSize = 5;
  const chunks: string[] = [];
  for (let start = 0; start < pdf.getPageCount(); start += chunkSize) {
    const chunkDocument = await PDFDocument.create();
    const end = Math.min(start + chunkSize, pdf.getPageCount());
    const pages = await chunkDocument.copyPages(pdf, Array.from({ length: end - start }, (_, offset) => start + offset));
    pages.forEach(page => chunkDocument.addPage(page));
    chunks.push(base64FromBytes(new Uint8Array(await chunkDocument.save())));
  }

  const questions: any[] = [];
  const providers = new Set<string>();
  const concurrency = 3;
  let processed = 0;
  for (let start = 0; start < chunks.length; start += concurrency) {
    const batch = chunks.slice(start, start + concurrency);
    const results = await Promise.all(batch.map(async (fileBase64, offset) => {
      const request = await callOpenRouterWithFallback(env, [{
        role: 'user',
        content: [
          { type: 'text', text: extractionPrompt(job.custom_instruction) },
          { type: 'file', file: { filename: `pages-${start + offset + 1}.pdf`, file_data: `data:application/pdf;base64,${fileBase64}` } },
        ],
      }], VISION_MODEL_FALLBACKS);
      return { model: request.model, quiz: parseJson(request.text) };
    }));
    for (const result of results) {
      providers.add(result.model);
      questions.push(...normalizeQuestions(result.quiz));
      processed += 1;
      await onProgress(processed, chunks.length, questions.length);
    }
  }
  if (!questions.length) throw new Error('The document did not contain any valid questions.');
  return { title: 'Extracted Quiz', description: 'Questions extracted from the uploaded document.', questions: normalizeQuestions(questions), provider: [...providers].join(', '), chunks: chunks.length };
}

async function extractJobQuiz(
  source: Uint8Array,
  job: ExtractionJobRow,
  env: ExtractionJobEnv,
  onProgress: (processed: number, total: number, questionCount: number) => Promise<void>,
): Promise<{ title: string; description: string; questions: any[]; provider: string; chunks: number }> {
  const mimeType = job.file_mime_type;
  const isLiteral = job.extraction_mode === 'literal';
  let text = '';

  if (isLiteral && mimeType === 'application/pdf') {
    text = await extractPdfTextContent(source);
    if (text.trim().length > 40) {
      const result = await extractQuestionsFromText(text, env, job.custom_instruction || undefined, async progress => {
        await onProgress(progress.processed, progress.total, progress.questionsExtracted);
      });
      return result;
    }
    return extractPdfVision(source, job, env, onProgress);
  }

  if (isLiteral && (mimeType.includes('wordprocessingml') || mimeType.includes('msword'))) {
    const wordDocument = new Uint8Array(source.byteLength);
    wordDocument.set(source);
    const result = await mammoth.extractRawText({ arrayBuffer: wordDocument.buffer });
    text = result.value;
  } else if (isLiteral && (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel'))) {
    const workbook = XLSX.read(source, { type: 'array' });
    text = workbook.SheetNames.map(name => `Sheet: ${name}\n${XLSX.utils.sheet_to_txt(workbook.Sheets[name])}`).join('\n\n');
  } else if (isLiteral && (mimeType === 'text/plain' || mimeType === 'text/markdown')) {
    text = new TextDecoder().decode(source);
  }

  if (text.trim()) {
    const result = await extractQuestionsFromText(text, env, job.custom_instruction || undefined, async progress => {
      await onProgress(progress.processed, progress.total, progress.questionsExtracted);
    });
    return result;
  }

  const prompt = isLiteral
    ? extractionPrompt(job.custom_instruction)
    : generatePrompt(job.requested_question_count || 20, job.custom_instruction);
  const base64 = base64FromBytes(source);
  const content = mimeType === 'application/pdf' || mimeType.includes('powerpoint')
    ? [{ type: 'text', text: prompt }, { type: 'file', file: { filename: 'uploaded-document', file_data: `data:${mimeType};base64,${base64}` } }]
    : [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }];
  const response = await callOpenRouterWithFallback(env, [{ role: 'user', content }], VISION_MODEL_FALLBACKS);
  const quiz = parseJson(response.text);
  const questions = normalizeQuestions(quiz);
  if (!questions.length) throw new Error('The document did not contain any valid questions.');
  await onProgress(1, 1, questions.length);
  return {
    title: typeof quiz?.title === 'string' ? quiz.title : 'Extracted Quiz',
    description: typeof quiz?.description === 'string' ? quiz.description : 'Questions extracted from the uploaded document.',
    questions,
    provider: response.model,
    chunks: 1,
  };
}

export function validateCreateExtractionJobInput(input: CreateExtractionJobInput, userId: string): string | null {
  if (!isValidIdempotencyKey(input.idempotencyKey)) return 'Invalid idempotency key.';
  if (!isSafeStoragePath(input.fileStoragePath, userId)) return 'Invalid file storage path.';
  if (!supportedMimeTypes.has(input.mimeType)) return 'Unsupported file type.';
  if (input.extractionMode !== 'literal' && input.extractionMode !== 'generate') return 'Invalid extraction mode.';
  if (input.customInstruction && input.customInstruction.length > 2000) return 'Custom instruction is too long.';
  if (input.requestedQuestionCount != null && (!Number.isInteger(input.requestedQuestionCount) || input.requestedQuestionCount < 1 || input.requestedQuestionCount > 500)) return 'Invalid question count.';
  return null;
}

export async function createOrGetExtractionJob(env: ExtractionJobEnv, authHeader: string, userId: string, input: CreateExtractionJobInput): Promise<ExtractionJobRow> {
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

async function fetchJobByIdempotency(env: ExtractionJobEnv, authHeader: string, userId: string, key: string): Promise<ExtractionJobRow | null> {
  const response = await fetch(apiUrl(env, `/rest/v1/extraction_jobs?user_id=eq.${encodeURIComponent(userId)}&idempotency_key=eq.${encodeURIComponent(key)}&select=*`), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) return null;
  const rows = await response.json() as ExtractionJobRow[];
  return rows[0] || null;
}

async function claimPendingJob(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<{ job: ExtractionJobRow; token: string } | null> {
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

export async function processExtractionJob(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<void> {
  const claimed = await claimPendingJob(env, authHeader, jobId);
  if (!claimed) return;
  const { job, token } = claimed;
  const startedAt = Date.now();
  let provider = 'openrouter';
  let chunks = 0;
  try {
    const source = await downloadSourceFile(env, authHeader, job.file_storage_path);
    await updateClaimedJob(env, authHeader, job.id, token, {
      progress_percentage: 5,
      progress_message: 'تم فتح الملف، جارٍ قراءة المحتوى.',
    });
    const result = await extractJobQuiz(source, job, env, async (processed, total, questionCount) => {
      chunks = total;
      const percentage = Math.max(8, Math.min(95, Math.round(5 + (processed / Math.max(total, 1)) * 90)));
      await updateClaimedJob(env, authHeader, job.id, token, {
        processed_chunks: processed,
        total_chunks: total,
        progress_percentage: percentage,
        progress_message: `معالجة الجزء ${processed}/${total} واستخراج ${questionCount} سؤالاً.`,
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
      progress_message: `اكتمل الاستخراج: ${result.questions.length} سؤالاً جاهزاً للمراجعة.`,
      questions_json: result.questions,
      quiz_title: result.title,
      quiz_description: result.description,
      provider: result.provider,
      completed_at: new Date().toISOString(),
      processing_token: null,
      processing_lease_expires_at: null,
    });
    await logExtractionPerformance(env, authHeader, job, result.provider, 'success', Date.now() - startedAt, result.chunks);
    await deleteSourceFile(env, authHeader, job.file_storage_path);
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
    await logExtractionPerformance(env, authHeader, job, provider, 'error', Date.now() - startedAt, chunks);
  }
}

export async function getExtractionJob(env: ExtractionJobEnv, authHeader: string, jobId: string): Promise<ExtractionJobRow | null> {
  return fetchJob(env, authHeader, jobId);
}

export async function listActiveExtractionJobs(env: ExtractionJobEnv, authHeader: string): Promise<ExtractionJobRow[]> {
  const response = await fetch(apiUrl(env, '/rest/v1/extraction_jobs?status=in.(pending,processing)&order=created_at.desc&limit=5&select=*'), {
    headers: databaseHeaders(env, authHeader),
  });
  if (!response.ok) throw new Error(`Active job read failed: ${response.status}`);
  return response.json() as Promise<ExtractionJobRow[]>;
}
