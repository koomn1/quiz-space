import { extractText as extractPdfText } from 'unpdf';

export interface DocumentExtractionEnv {
  OPENROUTER_API_KEY: string;
}

export interface DocumentExtractionResult {
  title: string;
  description: string;
  questions: any[];
  rawResponses: string[];
  chunks: number;
  provider: string;
}

const DOCUMENT_EXTRACTION_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'openai/gpt-oss-20b:free',
  'qwen/qwen3-235b-a22b:free',
];

const DOCUMENT_SINGLE_REQUEST_LIMIT = 500_000;
const EXTRACTION_OPTIONS = { max_tokens: 16_000, temperature: 0.1 };

function extractJson(text: string): unknown {
  let cleaned = text.trim();
  const objectStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');
  const starts = [objectStart, arrayStart].filter(index => index >= 0);
  const jsonStart = starts.length ? Math.min(...starts) : -1;
  if (jsonStart > 0) cleaned = cleaned.slice(jsonStart);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3).trimEnd();
  return JSON.parse(cleaned);
}

function buildPrompt(text: string, customInstruction?: string): string {
  const extra = customInstruction?.trim()
    ? `\n\nتعليمات إضافية من المستخدم:\n${customInstruction.slice(0, 2_000)}`
    : '';
  return `أنت أداة استخراج أسئلة دقيقة. اقرأ النص التالي واستخرج كل الأسئلة الموجودة فيه كما هي، من غير تعديل أو إعادة صياغة أو تلخيص.

قواعد صارمة:
- انسخ نص السؤال والاختيارات بالضبط مع الحفاظ على اللغة والترتيب.
- إذا كانت الإجابة الصحيحة مذكورة صراحة، حددها. إذا لم تكن مذكورة، استخدم null ولا تخمّن.
- تجاهل المقدمات والشروحات وأرقام الصفحات وأي نص ليس سؤالاً.
- حوّل اختيار من متعدد إلى type=mcq، والصح/الخطأ إلى type=tf، والمقالي أو الإجابة القصيرة إلى type=essay.
- أعد ترتيب الأسئلة حسب ظهورها، وحافظ على رقم السؤال الأصلي إن وجد.
- أجب بمصفوفة JSON فقط، بلا Markdown أو تعليق إضافي، بهذا الشكل:
[
  {
    "number": 1,
    "text": "نص السؤال",
    "type": "mcq",
    "options": ["أ", "ب", "ج", "د"],
    "correctIndex": null,
    "correctAnswer": null,
    "explanation": ""
  }
]

النص المصدر:
${text}${extra}`;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function normalizeQuestions(raw: any): any[] {
  const source = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : [];
  const seen = new Set<string>();
  const questions: any[] = [];

  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const text = String(item.text ?? item.question ?? '').trim();
    if (!text) continue;
    const key = normalize(text);
    if (seen.has(key)) continue;
    seen.add(key);

    const rawType = String(item.type || '').toLowerCase();
    const type = rawType === 'true_false' || rawType === 'true/false' || rawType === 'tf'
      ? 'tf'
      : rawType === 'open' || rawType === 'essay' || rawType === 'short_answer'
        ? 'essay'
        : 'mcq';
    const options: string[] = Array.isArray(item.options)
      ? item.options.map((option: unknown) => String(option ?? '').trim()).filter(Boolean)
      : [];
    const correctAnswer = item.correctAnswer == null ? '' : String(item.correctAnswer).trim();
    const parsedIndex = Number(item.correctIndex);
    let correctIndex = Number.isInteger(parsedIndex) && parsedIndex >= 0 ? parsedIndex : -1;
    if (correctIndex < 0 && correctAnswer && options.length > 0) {
      const answerKey = normalize(correctAnswer);
      const matchedIndex = options.findIndex(option => normalize(option) === answerKey);
      if (matchedIndex >= 0) correctIndex = matchedIndex;
    }

    const parsedNumber = Number(item.number);
    questions.push({
      number: Number.isInteger(parsedNumber) && parsedNumber > 0 ? parsedNumber : undefined,
      text,
      type,
      options: type === 'essay' ? [] : options,
      correctIndex,
      correctAnswer,
      explanation: item.explanation == null ? '' : String(item.explanation).trim(),
    });
  }
  return questions;
}

const MODEL_TIMEOUT_MS = 20_000;

/**
 * Last-resort parser for conventional exam layouts. It is intentionally strict:
 * it only accepts numbered questions and clearly labelled options/answers, so
 * it cannot invent content when a document has no question structure.
 */
function parseLiteralQuestions(text: string): any[] {
  const questions: any[] = [];
  let current: any | null = null;
  const flush = () => {
    if (current) questions.push(current);
    current = null;
  };
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    const questionMatch = line.match(/^(?:question\s*)?(\d{1,4})[.)\-:]\s*(.+)$/i);
    if (questionMatch) {
      flush();
      current = {
        number: Number(questionMatch[1]),
        text: questionMatch[2].trim(),
        type: 'essay',
        options: [],
        correctIndex: -1,
        correctAnswer: '',
        explanation: '',
      };
      continue;
    }
    if (!current) continue;

    const optionMatch = line.match(/^([A-H])\s*[).:\-]\s*(.+)$/i);
    if (optionMatch) {
      current.type = 'mcq';
      current.options.push(optionMatch[2].trim());
      continue;
    }

    const answerMatch = line.match(/^(?:answer|correct\s*answer)\s*[:\-]\s*(.+)$/i);
    if (answerMatch) {
      const answer = answerMatch[1].trim();
      current.correctAnswer = answer;
      const letter = answer.match(/^([A-H])(?:[).:]|\s|$)/i);
      if (letter && current.options.length > 0) {
        current.correctIndex = Math.max(0, Math.min(current.options.length - 1, letter[1].toUpperCase().charCodeAt(0) - 65));
        current.correctAnswer = current.options[current.correctIndex];
      } else if (/^(true|false)$/i.test(answer)) {
        current.type = 'tf';
        current.options = ['True', 'False'];
        current.correctIndex = /^true$/i.test(answer) ? 0 : 1;
      } else if (current.options.length > 0) {
        const answerKey = normalize(answer);
        const index = current.options.findIndex((option: string) => normalize(option) === answerKey);
        if (index >= 0) current.correctIndex = index;
      }
      continue;
    }

    // Preserve wrapped question lines, but never append obvious document headings.
    if (current.options.length === 0 && !/^(answer|section|chapter|page)\b/i.test(line)) {
      current.text = `${current.text} ${line}`.trim();
    }
  }
  flush();
  return questions;
}

function splitText(text: string): string[] {
  if (text.length <= DOCUMENT_SINGLE_REQUEST_LIMIT) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const targetEnd = Math.min(start + DOCUMENT_SINGLE_REQUEST_LIMIT, text.length);
    const boundary = targetEnd < text.length ? text.lastIndexOf('\n', targetEnd) : targetEnd;
    const end = boundary > start + 50_000 ? boundary : targetEnd;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

async function callModel(
  text: string,
  env: DocumentExtractionEnv,
  customInstruction?: string,
): Promise<{ raw: string; model: string }> {
  let lastError: unknown;
  for (const model of DOCUMENT_EXTRACTION_MODELS) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://koomn1.github.io/quiz-space/',
          'X-Title': 'QuizSpace',
        },
        body: JSON.stringify({
          model,
          ...EXTRACTION_OPTIONS,
          messages: [{ role: 'user', content: buildPrompt(text, customInstruction) }],
        }),
      });
      if (!response.ok) throw new Error(`OpenRouter ${model} failed: ${response.status}`);
      const data = await response.json() as any;
      clearTimeout(timeout);
      const raw = data.choices?.[0]?.message?.content;
      if (typeof raw !== 'string' || !raw.trim()) throw new Error(`OpenRouter ${model} returned an empty response`);
      return { raw, model };
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      lastError = error;
      console.warn(`Document extraction model ${model} failed; trying fallback.`, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All document extraction models failed.');
}

export async function extractQuestionsFromText(
  text: string,
  env: DocumentExtractionEnv,
  customInstruction?: string,
): Promise<DocumentExtractionResult> {
  const chunks = splitText(text.trim());
  if (!chunks.length || !chunks[0]) throw new Error('No extractable text found in the document.');

  const rawResponses: string[] = [];
  const parsedResults: any[] = [];
  const modelsUsed = new Set<string>();
  const CONCURRENCY = chunks.length === 1 ? 1 : 2;

  for (let start = 0; start < chunks.length; start += CONCURRENCY) {
    const batch = chunks.slice(start, start + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(chunk => callModel(chunk, env, customInstruction)));
    for (const result of batchResults) {
      rawResponses.push(result.raw);
      modelsUsed.add(result.model);
      try {
        parsedResults.push(extractJson(result.raw));
      } catch (error) {
        console.error('Document extraction response was not valid JSON; trying the local literal parser.', error);
      }
    }
  }

  const seen = new Set<string>();
  const questions: any[] = [];
  for (const result of parsedResults) {
    for (const question of normalizeQuestions(result)) {
      const key = normalize(question.text);
      if (!seen.has(key)) {
        seen.add(key);
        questions.push(question);
      }
    }
  }
  if (!questions.length) {
    const literalQuestions = normalizeQuestions(parseLiteralQuestions(text));
    if (literalQuestions.length > 0) {
      return {
        title: 'Extracted Quiz',
        description: 'Questions extracted from the uploaded document.',
        questions: literalQuestions.map((question, index) => ({ ...question, number: question.number || index + 1 })),
        rawResponses,
        chunks: chunks.length,
        provider: `${[...modelsUsed].join(', ') || 'none'}, local-format-parser`,
      };
    }
    throw new Error('The document did not contain any valid questions.');
  }

  return {
    title: 'Extracted Quiz',
    description: 'Questions extracted from the uploaded document.',
    questions: questions.map((question, index) => ({ ...question, number: question.number || index + 1 })),
    rawResponses,
    chunks: chunks.length,
    provider: [...modelsUsed].join(', '),
  };
}

export async function extractPdfTextContent(data: Uint8Array): Promise<string> {
  const result = await extractPdfText(data, { mergePages: true });
  const text = result.text as unknown;
  return typeof text === 'string' ? text : Array.isArray(text) ? text.join('\\n') : '';
}
