import mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import { extractPdfTextContent, extractQuestionsFromText } from '../documentExtraction';
import { generateWithProviderChain } from '../providerChain';
import type { ExtractionJobEnv, ExtractionJobRow } from './types';
import {
  detectQuestionBank,
  documentVisionPrompt,
  extractionPrompt,
  generatePrompt,
  parseAllowedQuestionTypes,
} from './prompts';
import {
  applyRequestedQuestionCount,
  deriveQuizTitle,
  isGenericQuizTitle,
  normalizeAnswerText,
  normalizeQuestions,
  sourceFileBaseName,
  validateGeneratedQuestions,
} from './schemas';
import {
  base64FromBytes,
  extractExcelText,
  extractPowerPointText,
  LARGE_PDF_PAGE_THRESHOLD,
  samplePdfText,
  selectVisionChunkPlan,
  shouldAttemptStructuredTableExtraction,
  shouldUseVisionForLargeScannedPdf,
} from './visionChunking';

export const VISION_MODEL_TIMEOUT_MS = 45_000;
export const AI_TEXT_FALLBACKS = ['mercury-3'];
export const AI_VISION_FALLBACKS = ['cohere/command-a-plus'];

export function extractBalancedJson(text: string, start: number): string | null {
  const opening = text[start];
  if (opening !== '{' && opening !== '[') return null;
  const stack = [opening];
  let quoted = false;
  let escaped = false;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === '{' || char === '[') stack.push(char);
    else if (char === '}' || char === ']') {
      const expected = char === '}' ? '{' : '[';
      if (stack.at(-1) !== expected) return null;
      stack.pop();
      if (!stack.length) return text.slice(start, index + 1);
    }
  }
  return null;
}

export function parseJson(text: string): any {
  const raw = String(text || '').trim();
  const candidates = [
    raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(),
    raw,
  ];
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* try an embedded response */ }
    const starts = [candidate.indexOf('{'), candidate.indexOf('[')].filter(index => index >= 0).sort((a, b) => a - b);
    for (const start of starts) {
      const embedded = extractBalancedJson(candidate, start);
      if (!embedded) continue;
      try { return JSON.parse(embedded); } catch { /* try a trailing-comma repair */ }
      try { return JSON.parse(embedded.replace(/,\s*([}\]])/g, '$1')); } catch { /* continue */ }
    }
  }
  throw new Error('AI returned invalid JSON.');
}

export async function callAiWithFallback(
  env: ExtractionJobEnv,
  messages: any[],
  _models: string[],
  options?: { maxTokens?: number; temperature?: number; validateResponse?: (text: string) => void },
): Promise<{ text: string; model: string }> {
  const requestOptions = {
    max_tokens: options?.maxTokens,
    temperature: options?.temperature,
    timeoutMs: VISION_MODEL_TIMEOUT_MS,
    reasoning_effort: 'low' as const,
    validateResponse: options?.validateResponse ?? (text => { parseJson(text); }),
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateWithProviderChain(env as any, messages, requestOptions);
      return { text: result.text, model: `${result.provider}/${result.model}` };
    } catch (error) {
      lastError = error;
      const message = String(error instanceof Error ? error.message : error);
      const transient = /429|503|502|504|overload|rate limit|busy|timeout|timed out|unavailable/i.test(message);
      if (!transient || attempt === 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI provider failed');
}

export async function extractPdfVision(
  source: Uint8Array,
  job: ExtractionJobRow,
  env: ExtractionJobEnv,
  onProgress: (processed: number, total: number, questionCount: number) => Promise<void>,
): Promise<{ title: string; description: string; questions: any[]; provider: string; chunks: number }> {
  const pdf = await PDFDocument.load(source);
  const plan = selectVisionChunkPlan(pdf.getPageCount(), source.byteLength, Boolean(env.XKIRO_API_KEY));
  const chunkSize = plan.pageCountPerChunk;
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
  const concurrency = plan.concurrency;
  let processed = 0;
  for (let start = 0; start < chunks.length; start += concurrency) {
    const batch = chunks.slice(start, start + concurrency);
    const results = await Promise.all(batch.map(async (fileBase64, offset) => {
      const request = await callAiWithFallback(env, [{
        role: 'user',
        content: [
          { type: 'text', text: documentVisionPrompt(job) },
          { type: 'file', file: { filename: `pages-${start + offset + 1}.pdf`, file_data: `data:application/pdf;base64,${fileBase64}` } },
        ],
      }], AI_VISION_FALLBACKS, { validateResponse: text => {
        const quiz = parseJson(text);
        if (!normalizeQuestions(quiz, parseAllowedQuestionTypes(job.custom_instruction)).length) {
          throw new Error('The document did not contain any valid questions.');
        }
      } });
      return { model: request.model, quiz: parseJson(request.text) };
    }));
    for (const result of results) {
      providers.add(result.model);
      questions.push(...normalizeQuestions(result.quiz, parseAllowedQuestionTypes(job.custom_instruction)).map(question => ({
        ...question,
        coverageId: question.coverageId || `source-page-group-${start + 1}`,
      })));
      processed += 1;
      await onProgress(processed, chunks.length, questions.length);
    }
  }
  if (!questions.length) throw new Error('The document did not contain any valid questions.');
  const normalizedQuestions = normalizeQuestions(questions, parseAllowedQuestionTypes(job.custom_instruction));
  const finalQuestions = applyRequestedQuestionCount(normalizedQuestions, job.extraction_mode, job.requested_question_count);
  return { title: deriveQuizTitle(job.source_file_name), description: `أسئلة مستخرجة من محتوى ${sourceFileBaseName(job.source_file_name) || 'الملف'}.`, questions: finalQuestions, provider: [...providers].join(', '), chunks: chunks.length };
}

export async function generateQuestionsFromText(
  text: string,
  job: ExtractionJobRow,
  env: ExtractionJobEnv,
  onProgress: (processed: number, total: number, questionCount: number) => Promise<void>,
): Promise<{ title: string; description: string; questions: any[]; provider: string; chunks: number }> {
  const questionBank = detectQuestionBank(text);
  // A numbered question bank has a source-defined target. Do not replace its
  // 300+ questions with the old text-density heuristic (which produced only a
  // few dozen questions for the Animal Breeding bank). Other Generate inputs
  // retain the previous content-derived behaviour.
  const automaticCount = questionBank.isQuestionBank
    ? Math.min(600, Math.max(1, questionBank.numberedQuestions))
    : Math.min(500, Math.max(3, Math.ceil(text.length / 1400)));
  // The old requested count belonged to the topic-quiz UI and could reduce a
  // complete file to three questions. Always cover the whole source instead.
  const requestedCount = automaticCount;
  // Large explicit requests must also cover the whole source. Sending 100/200
  // questions in one prompt commonly reaches the model output limit and makes
  // the whole job fail, so split the source and assign a proportional target
  // to every section.
  const sourceChunks: string[] = [];
  // Keep bank sections small enough for a complete JSON response. The overlap
  // protects questions whose options/answer appear at a section boundary;
  // the merge fingerprint below removes the repeated copy.
  const automaticChunkSize = questionBank.isQuestionBank ? 9_000 : 16_000;
  const automaticOverlap = questionBank.isQuestionBank ? 800 : 1_500;
  if (text.length <= automaticChunkSize) {
    sourceChunks.push(text);
  } else {
    for (let start = 0; start < text.length; ) {
      const targetEnd = Math.min(start + automaticChunkSize, text.length);
      const boundary = targetEnd < text.length ? text.lastIndexOf('\n', targetEnd) : targetEnd;
      const end = boundary > start + 6_000 ? boundary : targetEnd;
      sourceChunks.push(text.slice(start, end));
      if (end >= text.length) break;
      start = Math.max(start + 1, end - automaticOverlap);
    }
  }
  const totalChunks = Math.max(1, sourceChunks.length);
  const chunkTargets: Array<number | null> = requestedCount
    ? sourceChunks.map((chunk, index) => {
        if (index === sourceChunks.length - 1) {
          const assignedBeforeLast = sourceChunks.slice(0, -1).reduce(
            (sum, current) => sum + Math.max(1, Math.round(requestedCount * current.length / Math.max(1, text.length))),
            0,
          );
          return Math.max(1, requestedCount - assignedBeforeLast);
        }
        return Math.max(1, Math.round(requestedCount * chunk.length / Math.max(1, text.length)));
      })
    : sourceChunks.map(() => null);
  const messages = [{
    role: 'system',
    content: questionBank.isQuestionBank
      ? 'أنت محرك قراءة بنك أسئلة مصدرية. هذا الملف يحتوي أسئلة مرقمة موجودة بالفعل. اقرأ الجزء كاملًا واستخرج كل سؤال مرقم ظاهر فيه، مع نصه واختياراته والإجابة المحددة في المصدر. لا تنشئ أسئلة بديلة ولا تختصر ولا تتوقف بعد عدد صغير. إذا وجدت صفًا أو جدولًا يحتوي رقم السؤال والاختيارات والإجابة، حوّله إلى سؤال واحد. أعد JSON فقط دون مقدمة أو Markdown.'
      : 'أنت محرك استخراج وبناء اختبارات مصدرية. نفّذ خط العمل على هذا الجزء بالترتيب: اقرأ المحتوى كاملًا، التقط التعريفات والنقاط والعلاقات والجداول والمعادلات، ثم ابنِ أسئلة من المعلومات الموجودة فقط. لا تعتمد على كلام المستخدم خارج المصدر ولا على اسم الملف، ولا تقل إن الملف لا يحتوي أسئلة لأن المطلوب تحويل الشرح إلى اختبار. أعد JSON فقط دون مقدمة أو Markdown، مع رقم السؤال ثم نصه ثم الاختيارات ثم الإجابة الصحيحة ثم الشرح.',
  }];
  let lastError: unknown;
  const allowedTypes = parseAllowedQuestionTypes(job.custom_instruction);
  const allQuestions: any[] = [];
  const seen = new Set<string>();
  const providers = new Set<string>();
  let title = deriveQuizTitle(job.source_file_name, text);
  let description = `أسئلة مولدة من محتوى ${sourceFileBaseName(job.source_file_name) || 'الملف'}.`;

  // Text extraction uses one provider. Serializing sections avoids sending a
  // burst of large JSON requests that the provider rejects as overloaded.
  const concurrency = 1;
  for (let start = 0; start < sourceChunks.length; start += concurrency) {
    const batch = sourceChunks.slice(start, start + concurrency);
    const results = await Promise.all(batch.map(async (sourceChunk) => {
      const chunkIndex = sourceChunks.indexOf(sourceChunk, start);
      const chunkTarget = chunkTargets[chunkIndex] || null;
      const chunkMessages = [
        messages[0],
        { role: 'user', content: `${generatePrompt(chunkTarget, job.custom_instruction, sourceChunk)}\n\nمحتوى الملف المصدر — الجزء الحالي ${questionBank.isQuestionBank ? '(استخرج كل الأسئلة المرقمة الموجودة هنا، ولا تترك أي سؤال)' : '(استخرج كل النقاط القابلة للسؤال من هذا الجزء)'}:\n${sourceChunk}` },
      ];
      let chunkError: unknown;
      try {
        const response = await callAiWithFallback(env, chunkMessages, AI_TEXT_FALLBACKS, {
          maxTokens: chunkTarget ? Math.min(12_000, Math.max(3_000, chunkTarget * 240)) : 8_000,
          temperature: 0.2,
          validateResponse: text => {
            const quiz = parseJson(text);
            const questions = validateGeneratedQuestions(normalizeQuestions(quiz, allowedTypes));
            if (!questions.length) throw new Error('The document section did not contain valid generated questions.');
          },
        });
        const quiz = parseJson(response.text);
        const verifiedQuestions = validateGeneratedQuestions(normalizeQuestions(quiz, allowedTypes));
        if (!verifiedQuestions.length) throw new Error('The document section did not contain valid generated questions.');
        return { response, quiz, questions: verifiedQuestions };
      } catch (error) {
        chunkError = error;
        console.warn('Text generation section failed after all configured providers were tried.', error);
        throw chunkError instanceof Error ? chunkError : new Error('All text generation providers failed for this section.');
      }
    }).map(promise => promise.catch(error => ({ error }))));

    for (const result of results) {
      if ('error' in result) {
        lastError = result.error;
      } else {
        providers.add(result.response.model);
        if (!isGenericQuizTitle(result.quiz?.title)) title = String(result.quiz.title).trim();
        if (typeof result.quiz?.description === 'string' && result.quiz.description.trim()) description = result.quiz.description.trim();
        const sourceSectionId = `source-section-${sourceChunks.indexOf(batch[0] || '', 0) + 1}`;
        for (const question of result.questions) {
          const sourceGroundedQuestion = {
            ...question,
            coverageId: question.coverageId || sourceSectionId,
          };
          const key = normalizeAnswerText(sourceGroundedQuestion.text || '');
          if (key && !seen.has(key)) {
            seen.add(key);
            allQuestions.push(sourceGroundedQuestion);
          }
        }
      }
      await onProgress(Math.min(start + results.length, totalChunks), totalChunks, allQuestions.length);
    }
  }

  if (!allQuestions.length) throw lastError instanceof Error ? lastError : new Error('The document did not contain any valid questions.');
  const finalQuestions = allQuestions.slice(0, requestedCount);
  return { title, description, questions: finalQuestions, provider: [...providers].join(', ') || 'ai-provider', chunks: totalChunks };
}

export async function extractJobQuiz(
  source: Uint8Array,
  job: ExtractionJobRow,
  env: ExtractionJobEnv,
  onProgress: (processed: number, total: number, questionCount: number) => Promise<void>,
): Promise<{ title: string; description: string; questions: any[]; provider: string; chunks: number }> {
  const mimeType = job.file_mime_type;
  const isLiteral = job.extraction_mode === 'literal';
  let text = '';

  if (mimeType === 'application/pdf') {
    const pageCount = (await PDFDocument.load(source)).getPageCount();
    if (pageCount >= LARGE_PDF_PAGE_THRESHOLD) {
      const sampledText = await samplePdfText(source, pageCount);
      if (shouldUseVisionForLargeScannedPdf(pageCount, sampledText)) {
        await onProgress(0, Math.ceil(pageCount / 5), 0);
        return extractPdfVision(source, job, env, onProgress);
      }
    }
    text = await extractPdfTextContent(source);
    if (text.trim().length > 40) {
      // Structured Question Banks already contain the question, choices and
      // answer key. Extract them losslessly before either Literal or Generate;
      // sending them through an LLM can truncate a large bank at its output
      // limit and is unnecessary.
      try {
        const hasStructuredTableSignal = shouldAttemptStructuredTableExtraction(text);

        // Literal extraction must remain lossless and deterministic for text-based
        // question banks. A layout signal alone is not enough reason to send a
        // readable PDF through the slower vision provider; that path previously
        // left this 20-page MCQ bank stuck at the initial 8% stage.
        if (isLiteral) {
          const result = await extractQuestionsFromText(text, env, job.custom_instruction || undefined, async progress => {
            await onProgress(progress.processed, progress.total, progress.questionsExtracted);
          });
          if (result.questions.length > 0 || !hasStructuredTableSignal) {
            return {
              ...result,
              questions: applyRequestedQuestionCount(result.questions, job.extraction_mode, job.requested_question_count),
              title: isGenericQuizTitle(result.title) ? deriveQuizTitle(job.source_file_name, text) : result.title.trim(),
              description: result.description?.trim() || `أسئلة مستخرجة من محتوى ${sourceFileBaseName(job.source_file_name) || 'الملف'}.`,
            };
          }
        }

        if (!hasStructuredTableSignal) return generateQuestionsFromText(text, job, env, onProgress);
        // Tables are layout-dependent. Do not trust coordinate/text parsing as
        // the source of truth because merged cells, RTL columns, and scanned
        // cells can silently reorder questions and answers. Send the complete
        // PDF through the xKiro vision path so the table is read visually.
        return extractPdfVision(source, job, env, onProgress);
      } catch (error) {
        console.warn('PDF table parser unavailable; continuing with the configured extraction mode.', error);
      }
      if (isLiteral) {
        const result = await extractQuestionsFromText(text, env, job.custom_instruction || undefined, async progress => {
          await onProgress(progress.processed, progress.total, progress.questionsExtracted);
        });
        return {
          ...result,
          questions: applyRequestedQuestionCount(result.questions, job.extraction_mode, job.requested_question_count),
          title: isGenericQuizTitle(result.title) ? deriveQuizTitle(job.source_file_name, text) : result.title.trim(),
          description: result.description?.trim() || `أسئلة مستخرجة من محتوى ${sourceFileBaseName(job.source_file_name) || 'الملف'}.`,
        };
      }
      return generateQuestionsFromText(text, job, env, onProgress);
    }
    return extractPdfVision(source, job, env, onProgress);
  }

  if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
    const wordDocument = new Uint8Array(source.byteLength);
    wordDocument.set(source);
    const result = await mammoth.extractRawText({ arrayBuffer: wordDocument.buffer });
    text = result.value;
  } else if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) {
    text = await extractExcelText(source);
  } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    text = new TextDecoder().decode(source);
  } else if (mimeType.includes('presentationml') || mimeType.includes('powerpoint')) {
    text = await extractPowerPointText(source);
  }
  if (text.trim()) {
    if (isLiteral) {
      const result = await extractQuestionsFromText(text, env, job.custom_instruction || undefined, async progress => {
        await onProgress(progress.processed, progress.total, progress.questionsExtracted);
      });
      return {
        ...result,
        questions: applyRequestedQuestionCount(result.questions, job.extraction_mode, job.requested_question_count),
        title: isGenericQuizTitle(result.title) ? deriveQuizTitle(job.source_file_name, text) : result.title.trim(),
        description: result.description?.trim() || `أسئلة مستخرجة من محتوى ${sourceFileBaseName(job.source_file_name) || 'الملف'}.`,
      };
    }

    return generateQuestionsFromText(text, job, env, onProgress);
  }

  const prompt = isLiteral
    ? extractionPrompt(job.custom_instruction, text)
    : generatePrompt(null, job.custom_instruction);
  const base64 = base64FromBytes(source);
  const content = mimeType === 'application/pdf' || mimeType.includes('powerpoint')
    ? [{ type: 'text', text: prompt }, { type: 'file', file: { filename: 'uploaded-document', file_data: `data:${mimeType};base64,${base64}` } }]
    : [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }];
  const response = await callAiWithFallback(
    env,
    [{ role: 'user', content }],
    AI_VISION_FALLBACKS,
    { maxTokens: job.extraction_mode === 'generate' && job.requested_question_count ? 8_000 : 12_000, temperature: 0.2 },
  );
  const quiz = parseJson(response.text);
  const questions = normalizeQuestions(quiz, parseAllowedQuestionTypes(job.custom_instruction));
  if (!questions.length) throw new Error('The document did not contain any valid questions.');
  const finalQuestions = applyRequestedQuestionCount(questions, job.extraction_mode, job.requested_question_count);
  await onProgress(1, 1, finalQuestions.length);
  return {
    title: !isGenericQuizTitle(quiz?.title) ? String(quiz.title).trim() : deriveQuizTitle(job.source_file_name, text),
    description: typeof quiz?.description === 'string' && quiz.description.trim() ? quiz.description.trim() : `أسئلة مستخرجة من محتوى ${sourceFileBaseName(job.source_file_name) || 'الملف'}.`,
    questions: finalQuestions,
    provider: response.model,
    chunks: 1,
  };
}
