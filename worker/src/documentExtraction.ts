import { extractText as extractPdfText } from 'unpdf';
import { getDocument } from 'unpdf/pdfjs';
import { generateWithProviderChain } from './providerChain';
import { FsmQuestionParser } from './fsmQuestionParser';

export interface DocumentExtractionEnv {
  INCEPTION_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
}

export interface DocumentExtractionResult {
  title: string;
  description: string;
  questions: any[];
  rawResponses: string[];
  chunks: number;
  provider: string;
}

export interface DocumentExtractionProgress {
  processed: number;
  total: number;
  questionsExtracted: number;
}

const DOCUMENT_EXTRACTION_MODELS = ['mercury-3', 'openai/gpt-oss-20b', 'gemini-3.8-flash', 'gpt-5-mini'];

// Keep each provider request bounded: one huge 100–200 question prompt is slow,
// exceeds output limits easily, and makes the whole extraction fail atomically.
const DOCUMENT_SINGLE_REQUEST_LIMIT = 120_000;
const EXTRACTION_OPTIONS = { max_tokens: 12_000, temperature: 0.1 };

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(cleaned); } catch { /* find a balanced JSON value inside provider prose */ }
  const candidates: unknown[] = [];
  for (let start = 0; start < cleaned.length; start += 1) {
    const char = cleaned[start];
    if (char !== '{' && char !== '[') continue;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const current = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (current === '\\\\') escaped = true;
        else if (current === '"') inString = false;
        continue;
      }
      if (current === '"') { inString = true; continue; }
      if (current === '{' || current === '[') stack.push(current);
      else if (current === '}' || current === ']') {
        const opening = stack.pop();
        if ((current === '}' && opening !== '{') || (current === ']' && opening !== '[')) break;
        if (stack.length === 0) {
          try { candidates.push(JSON.parse(cleaned.slice(start, index + 1))); } catch { /* try the next balanced candidate */ }
          break;
        }
      }
    }
  }
  const structured = candidates.find(candidate => Array.isArray(candidate)
    || Boolean(candidate && typeof candidate === 'object' && Array.isArray((candidate as any).questions)));
  if (structured !== undefined) return structured;
  if (candidates.length > 0) return candidates[candidates.length - 1];
  throw new Error('No valid JSON object or array found in model response.');
}

type AllowedQuestionType = 'mcq' | 'tf' | 'essay';

function parseAllowedQuestionTypes(customInstruction?: string): AllowedQuestionType[] {
  const marker = String(customInstruction || '').match(/\[QUESTION_TYPES_ALLOWED:\s*([^\]]+)\]/i);
  if (!marker) return ['mcq', 'tf', 'essay'];
  const allowed = marker[1].split(/[,+\s]+/).filter((type): type is AllowedQuestionType => type === 'mcq' || type === 'tf' || type === 'essay');
  return allowed.length ? [...new Set(allowed)] : ['mcq', 'tf', 'essay'];
}

function sourceLanguageInstruction(text: string): string {
  const sample = text.slice(0, 120_000);
  const arabic = (sample.match(/[\u0600-\u06ff]/g) || []).length;
  const latin = (sample.match(/[A-Za-z]/g) || []).length;
  if (arabic >= 8 && arabic >= latin * 0.2) return 'اكتب كل النصوص بنفس لغة المصدر العربية، ولا تترجم إلى الإنجليزية.';
  if (latin >= 8 && latin >= arabic * 0.2) return 'Write all quiz text in the source language, English. Do not translate it into Arabic.';
  return 'Detect the dominant source language and keep the entire output in that language. Do not translate it.';
}

function buildPrompt(text: string, customInstruction?: string): string {
  const allowed = parseAllowedQuestionTypes(customInstruction);
  const allowedInstruction = `Allowed output types only: ${allowed.join(', ')}. Never return any other type.`;
  const extra = customInstruction?.trim()
    ? `\n\nتعليمات إضافية من المستخدم:\n${customInstruction.slice(0, 2_000)}`
    : '';
  return `أنت أداة استخراج أسئلة دقيقة. اقرأ النص التالي واستخرج كل الأسئلة الموجودة فيه كما هي، من غير تعديل أو إعادة صياغة أو تلخيص.
${sourceLanguageInstruction(text)}
${allowedInstruction}

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

function normalizeTrueFalseOptions(questionText: string, options: string[]): string[] {
  const hasArabicQuestion = /[\u0600-\u06ff]/u.test(questionText);
  const hasArabicOptions = options.some(option => /[\u0600-\u06ff]/u.test(option));
  const hasLatinQuestion = /[A-Za-z]/.test(questionText);
  const hasLatinOptions = options.some(option => /[A-Za-z]/.test(option));
  if (hasLatinQuestion && hasArabicOptions) return ['True', 'False'];
  if (hasArabicQuestion && hasLatinOptions) return ['صح', 'خطأ'];
  return options;
}

function normalizeQuestions(raw: any, allowedTypes: AllowedQuestionType[] = ['mcq', 'tf', 'essay'], normalizationOptions: { preserveDuplicates?: boolean } = {}): any[] {
  const source = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : [];
  const seen = new Set<string>();
  const questions: any[] = [];

  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const text = String(item.text ?? item.question ?? '').trim();
    if (!text) continue;
    const key = normalize(text);
    if (!normalizationOptions.preserveDuplicates && seen.has(key)) continue;
    seen.add(key);

    const rawType = String(item.type || '').toLowerCase();
    const type = rawType === 'true_false' || rawType === 'true/false' || rawType === 'tf'
      ? 'tf'
      : rawType === 'open' || rawType === 'essay' || rawType === 'short_answer'
        ? 'essay'
        : 'mcq';
    if (!allowedTypes.includes(type)) continue;
    const parsedOptions: string[] = Array.isArray(item.options)
      ? item.options.map((option: unknown) => String(option ?? '').trim()).filter(Boolean)
      : [];
    const options = type === 'tf' ? normalizeTrueFalseOptions(text, parsedOptions) : parsedOptions;
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
      extractionMethod: item.extractionMethod === 'direct' ? 'direct' : undefined,
      sourceText: typeof item.sourceText === 'string' ? item.sourceText : undefined,
      reviewRequired: item.reviewRequired === true || (type !== 'essay' && correctIndex < 0),
    });
  }
  return questions;
}

const MODEL_TIMEOUT_MS = 35_000;

type PdfLayoutItem = { text: string; x: number; y: number; width: number };
type PdfLayoutLine = { y: number; items: PdfLayoutItem[] };

type PdfTextItem = { str: string; transform: number[]; width?: number };

function isPdfTextItem(value: unknown): value is PdfTextItem {
  return Boolean(value && typeof value === 'object' && 'str' in value && 'transform' in value);
}

function groupPdfTextLines(items: unknown[]): PdfLayoutLine[] {
  const lines: PdfLayoutLine[] = [];
  for (const value of items) {
    if (!isPdfTextItem(value) || !value.str.trim()) continue;
    const x = Number(value.transform[4]);
    const y = Number(value.transform[5]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const existing = lines.find(line => Math.abs(line.y - y) <= 2);
    const item = { text: value.str.trim(), x, y, width: Number(value.width) || 0 };
    if (existing) existing.items.push(item);
    else lines.push({ y, items: [item] });
  }
  return lines
    .map(line => ({ ...line, items: line.items.sort((a, b) => a.x - b.x) }))
    .sort((a, b) => b.y - a.y);
}

function joinLayoutCell(items: PdfLayoutItem[]): string {
  return items.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Rebuilds table rows from PDF text coordinates. A plain text extractor loses
 * the relationship between question, A/B/C/D and Correct when cells wrap.
 * This path keeps that relationship and is intentionally limited to tables
 * that expose the standard Question/A/B/C/D/Correct header.
 */
export async function extractTableQuestionsFromPdf(data: Uint8Array): Promise<any[]> {
  const pdf = await getDocument({ data, useWorkerFetch: false }).promise;
  const questions: any[] = [];
  let columnBoundaries: number[] | null = null;
  let pendingQuestionLines: string[] = [];
  let pendingPreNumberRows: PdfLayoutItem[][] = [];
  let current: { number: number; numberY: number; cells: PdfLayoutItem[][]; sourceLines: string[] } | null = null;
  const flush = () => {
    if (!current || !current.cells[0].length) return;
    const cells = current.cells.map(joinLayoutCell);
    const options = cells.slice(1, 5).filter(Boolean);
    const answer = cells[5].match(/[A-H]/i)?.[0]?.toUpperCase() || '';
    const correctIndex = answer ? answer.charCodeAt(0) - 65 : -1;
    if (!cells[0] || options.length < 2 || correctIndex < 0 || correctIndex >= options.length) return;
    const isTrueFalse = options.length === 2 && options.every(option => /^(?:true|false|صح|خطأ)$/i.test(option));
    questions.push({
      number: current.number,
      text: cells[0],
      type: isTrueFalse ? 'tf' : 'mcq',
      options,
      correctIndex,
      correctAnswer: options[correctIndex] || '',
      explanation: '',
      extractionMethod: 'pdf-table',
      sourceText: current.sourceLines.join('\n'),
      reviewRequired: false,
    });
  };

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const lines = groupPdfTextLines(content.items);
    for (const line of lines) {
      const header = line.items.map(item => item.text.toLowerCase());
      const correctHeaderIndex = header.indexOf('correct');
      const optionHeaderIndex = header.indexOf('a');
      if (correctHeaderIndex >= 0 && optionHeaderIndex >= 0) {
        flush();
        current = null;
        pendingQuestionLines = [];
        const questionHeader = line.items.find(item => item.text.toLowerCase() === 'question');
        const optionHeaders = line.items.filter(item => ['a', 'b', 'c', 'd', 'correct'].includes(item.text.toLowerCase()));
        if (questionHeader && optionHeaders.length >= 3) {
          // Header labels are often centered while cell text is left-aligned.
          // Use midpoints between headers for the inner boundaries and a
          // generous first-cell boundary so wrapped question text remains in
          // column 0. The last boundary is intentionally wide enough to
          // accept a Correct cell whose text is centered farther right.
          const starts = optionHeaders.map(item => item.x).sort((a, b) => a - b);
          columnBoundaries = [
            // Option labels are centered, while option text can begin well
            // to the left of the label (especially short answers). Leave a
            // wider gutter so the first option is not mistaken for question
            // text when the table is rebuilt from coordinates.
            Math.max(questionHeader.x + 8, starts[0] - 45),
            ...starts.slice(0, -1).map((x, index) => (x + starts[index + 1]) / 2),
            starts.at(-1)! - 8,
          ];
        }
        continue;
      }
      const first = line.items[0];
      const numberMatch = first?.text.match(/^(\d{1,4})$/);
      // Some exports omit the header on continuation pages. Infer the five
      // table columns from a numbered row containing an answer marker, so the
      // direct path still covers the complete bank instead of only page one.
      if (!columnBoundaries && numberMatch) {
        const answerItem = line.items.find(item => item.x > first.x + 70 && /^[A-D]$/i.test(item.text));
        const rightItems = line.items.filter(item => item.x > first.x + 45);
        if (answerItem && rightItems.length >= 3) {
          const starts = rightItems.filter(item => !/^[A-D]$/i.test(item.text)).map(item => item.x).sort((a, b) => a - b);
          const answerX = answerItem.x;
          if (starts.length >= 2) {
            const optionStarts = [...new Set(starts)].slice(0, 4);
            columnBoundaries = [
              optionStarts[0] - 24,
              ...optionStarts.slice(0, -1).map((x, index) => (x + optionStarts[index + 1]) / 2),
              answerX - 8,
            ];
          }
        }
      }
      if (!columnBoundaries) continue;
      if (numberMatch && first.x < columnBoundaries[0]) {
        flush();
        current = { number: Number(numberMatch[1]), numberY: line.y, cells: [[], [], [], [], [], []], sourceLines: [] };
        if (pendingQuestionLines.length) {
          current.cells[0].push(...pendingQuestionLines.map(text => ({ text, x: columnBoundaries![0], y: line.y, width: 0 })));
          current.sourceLines.push(...pendingQuestionLines);
          pendingQuestionLines = [];
        }
        if (pendingPreNumberRows.length) {
          for (const row of pendingPreNumberRows) {
            current.sourceLines.push(joinLayoutCell(row));
            for (const item of row) {
              let cell = 0;
              if (item.x >= columnBoundaries[4]) cell = 5;
              else if (item.x >= columnBoundaries[3]) cell = 4;
              else if (item.x >= columnBoundaries[2]) cell = 3;
              else if (item.x >= columnBoundaries[1]) cell = 2;
              else if (item.x >= columnBoundaries[0]) cell = 1;
              current.cells[cell].push(item);
            }
          }
          pendingPreNumberRows = [];
        }
      }
      if (!current) {
        const orphanQuestion = line.items.filter(item => item.x < columnBoundaries![0]);
        if (orphanQuestion.length) pendingQuestionLines.push(joinLayoutCell(orphanQuestion));
        continue;
      }
      const nonEmptyItems = line.items.filter(item => item.text.trim());
      const questionOnly = nonEmptyItems.length > 0 && nonEmptyItems.every(item => item.x < columnBoundaries![0]);
      // PDF exports are not consistent: a question's text may be placed
      // before its number row, after it, or on both sides when it wraps.
      // Keep isolated question-column lines that are clearly closer to the
      // next row pending, then attach them when that number arrives. Small
      // negative offsets are still part of the current wrapped question.
      if (questionOnly && (line.y > current.numberY + 2 || line.y < current.numberY - 16)) {
        pendingQuestionLines.push(joinLayoutCell(nonEmptyItems));
        continue;
      }
      // In several PDF exports the next row's choices are emitted before its
      // number. Defer those option-column items instead of attaching them to
      // the previous question; they are assigned by x-coordinate when the
      // next number starts.
      if (line.y < current.numberY - 14) {
        pendingPreNumberRows.push(nonEmptyItems);
        continue;
      }
      const cellItems: PdfLayoutItem[][] = [[], [], [], [], [], []];
      for (const item of line.items) {
        if (item.text === first?.text && numberMatch && item === first) continue;
        let cell = 0;
        if (item.x >= columnBoundaries[4]) cell = 5;
        else if (item.x >= columnBoundaries[3]) cell = 4;
        else if (item.x >= columnBoundaries[2]) cell = 3;
        else if (item.x >= columnBoundaries[1]) cell = 2;
        else if (item.x >= columnBoundaries[0]) cell = 1;
        cellItems[cell].push(item);
      }
      const lineValues = cellItems.map(joinLayoutCell);
      if (lineValues.some(Boolean)) current.sourceLines.push(lineValues.filter(Boolean).join(' | '));
      cellItems.forEach((items, index) => current?.cells[index].push(...items));
    }
  }
  flush();
  return questions.sort((a, b) => a.number - b.number);
}

/**
 * Last-resort parser for conventional exam layouts. It is intentionally strict:
 * it only accepts numbered questions and clearly labelled options/answers, so
 * it cannot invent content when a document has no question structure.
 */
const LITERAL_QUESTION_PATTERN = /^(?:(?:question|q|سؤال)\s*)?([0-9٠-٩]{1,4})(?:[.)\-:]\s*|\s+)(.+)$/iu;
const QUESTION_START_PATTERN = /^(?:(?:question|q|سؤال)\s*)?[0-9٠-٩]{1,4}(?:[.)\-:]|\s)\s*\S.*$/gim;
const toAsciiDigits = (value: string) => value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export function parseLiteralQuestions(text: string): any[] {
  const questions: any[] = [];
  let current: any | null = null;
  const flush = () => {
    if (current) {
      current.reviewRequired = current.type !== 'essay' && current.correctIndex < 0;
      questions.push(current);
    }
    current = null;
  };
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    const questionMatch = line.match(LITERAL_QUESTION_PATTERN);
    if (questionMatch) {
      flush();
      current = {
        number: Number(toAsciiDigits(questionMatch[1])),
        text: questionMatch[2].trim(),
        sourceText: line,
        extractionMethod: 'direct',
        type: 'essay',
        options: [],
        correctIndex: -1,
        correctAnswer: '',
        explanation: '',
      };
      continue;
    }
    if (!current) continue;

    const labelledOption = line.match(/^([A-H]|[أبجدهوزح])\s*(?:[).:،\-–—])\s*(.+)$/iu);
    const bulletOption = line.match(/^[-*•▪◦–—]\s+(.+)$/u);
    const optionText = labelledOption?.[2] || bulletOption?.[1];
    if (optionText) {
      current.type = 'mcq';
      current.options.push(optionText.trim());
      current.sourceText = `${current.sourceText}\n${line}`;
      continue;
    }

    const answerMatch = line.match(/^(?:answer|correct\s*answer|الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?)\s*[:\-]\s*(.+)$/iu);
    if (answerMatch) {
      const answer = answerMatch[1].trim();
      current.correctAnswer = answer;
      current.sourceText = `${current.sourceText}\n${line}`;
      const letter = answer.match(/^([A-Hأبجدهوزح])(?:[).:]|\s|$)/iu);
      if (letter && current.options.length > 0) {
        const label = letter[1].toLocaleUpperCase();
        const arabicLabels: Record<string, number> = { 'أ': 0, 'ب': 1, 'ج': 2, 'د': 3, 'ه': 4, 'و': 5, 'ز': 6, 'ح': 7 };
        const answerIndex = /^[A-H]$/i.test(label) ? label.charCodeAt(0) - 65 : (arabicLabels[label] ?? -1);
        if (answerIndex >= 0 && answerIndex < current.options.length) {
          current.correctIndex = answerIndex;
          current.correctAnswer = current.options[current.correctIndex];
        } else {
          current.correctAnswer = '';
        }
      } else if (/^(true|false|صح|خطأ)$/iu.test(answer)) {
        current.type = 'tf';
        const isTrue = /^(true|صح)$/iu.test(answer);
        current.options = /^(true|false)$/i.test(answer) ? ['True', 'False'] : ['صح', 'خطأ'];
        current.correctIndex = isTrue ? 0 : 1;
      } else if (current.options.length > 0) {
        const answerKey = normalize(answer);
        const index = current.options.findIndex((option: string) => normalize(option) === answerKey);
        if (index >= 0) current.correctIndex = index;
      }
      continue;
    }

    if (/^(?:section|chapter|page|explanation|تعليل|شرح|ملاحظة)\b/i.test(line)) continue;
    current.sourceText = `${current.sourceText}\n${line}`;
    if (current.options.length > 0) {
      const lastOption = current.options.length - 1;
      current.options[lastOption] = `${current.options[lastOption]} ${line}`.trim();
    } else {
      current.text = `${current.text} ${line}`.trim();
    }
  }
  flush();
  return questions;
}

/**
 * Secondary deterministic parser. The legacy parser remains first so existing
 * output stays byte-compatible; this path only takes over when the legacy
 * parser cannot prove that it captured the complete question structure.
 */
function parseFsmQuestionsForLegacyOutput(text: string, allowedTypes: AllowedQuestionType[]): any[] {
  const parsed = FsmQuestionParser.parseLines(
    text.split(/\r?\n/).map(line => ({ text: line, pageNumber: 1 })),
  );
  return parsed.questions
    .filter(question => allowedTypes.includes(question.questionType === 'true_false' ? 'tf' : question.questionType === 'essay' ? 'essay' : 'mcq'))
    .map((question, index) => {
      const correctIndex = question.options.findIndex(option => option.isCorrect);
      const type = question.questionType === 'true_false' ? 'tf' : question.questionType === 'essay' ? 'essay' : 'mcq';
      return {
        number: Number(question.rawNumber) || index + 1,
        text: question.stem,
        sourceText: question.rawSpan,
        extractionMethod: 'direct',
        type,
        options: type === 'essay' ? [] : question.options.map(option => option.text),
        correctIndex: correctIndex >= 0 ? correctIndex : -1,
        correctAnswer: question.correctAnswer || '',
        explanation: question.explanation || '',
        reviewRequired: type !== 'essay' && correctIndex < 0,
      };
    });
}

export function isReliableLiteralExtraction(text: string, questions: any[]): boolean {
  const questionMarkers = text.split(/\r?\n/).map(line => line.trim()).filter(line => LITERAL_QUESTION_PATTERN.test(line)).length;
  return questionMarkers > 0
    && questionMarkers === questions.length
    && questions.every(question => Boolean(question?.text?.trim())
      && (question.type === 'essay' || (Array.isArray(question.options) && question.options.length >= 2)));
}

export function splitTextForExtraction(text: string): string[] {
  if (text.length <= DOCUMENT_SINGLE_REQUEST_LIMIT) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const targetEnd = Math.min(start + DOCUMENT_SINGLE_REQUEST_LIMIT, text.length);
    const remaining = text.slice(start, targetEnd);
    const questionStarts = [...remaining.matchAll(QUESTION_START_PATTERN)];
    const lastQuestionStart = questionStarts.at(-1)?.index;
    const lineBoundary = targetEnd < text.length ? text.lastIndexOf('\n', targetEnd) : targetEnd;
    const questionBoundary = typeof lastQuestionStart === 'number' ? start + lastQuestionStart : -1;
    const end = questionBoundary > start + 50_000
      ? questionBoundary
      : lineBoundary > start + 50_000 ? lineBoundary + 1 : targetEnd;
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
  const result = await generateWithProviderChain(env as any, [{ role: 'user', content: buildPrompt(text, customInstruction) }], EXTRACTION_OPTIONS);
  return { raw: result.text, model: `${result.provider}/${result.model}` };
}

export async function extractQuestionsFromText(
  text: string,
  env: DocumentExtractionEnv,
  customInstruction?: string,
  onProgress?: (progress: DocumentExtractionProgress) => Promise<void> | void,
): Promise<DocumentExtractionResult> {
  const normalizedText = text.trim();
  const allowedTypes = parseAllowedQuestionTypes(customInstruction);
  const localFastPath = normalizeQuestions(parseLiteralQuestions(normalizedText), allowedTypes, { preserveDuplicates: true });
  if (isReliableLiteralExtraction(normalizedText, localFastPath)) {
    if (onProgress) await onProgress({ processed: 1, total: 1, questionsExtracted: localFastPath.length });
    return {
      title: 'Extracted Quiz',
      description: 'Questions extracted from the uploaded document.',
      questions: localFastPath.map((question, index) => ({ ...question, number: question.number || index + 1 })),
      rawResponses: [],
      chunks: 1,
      provider: 'local-format-parser',
    };
  }

  const fsmFallback = normalizeQuestions(parseFsmQuestionsForLegacyOutput(normalizedText, allowedTypes), allowedTypes, { preserveDuplicates: true });
  if (isReliableLiteralExtraction(normalizedText, fsmFallback)) {
    if (onProgress) await onProgress({ processed: 1, total: 1, questionsExtracted: fsmFallback.length });
    return {
      title: 'Extracted Quiz',
      description: 'Questions extracted from the uploaded document.',
      questions: fsmFallback.map((question, index) => ({ ...question, number: question.number || index + 1 })),
      rawResponses: [],
      chunks: 1,
      provider: 'local-fsm-parser',
    };
  }

  const chunks = splitTextForExtraction(normalizedText);
  if (!chunks.length || !chunks[0]) throw new Error('No extractable text found in the document.');

  const rawResponses: string[] = [];
  const parsedResults: any[] = [];
  const chunkErrors: unknown[] = [];
  const modelsUsed = new Set<string>();
  // Three bounded requests reduce wall-clock time while avoiding provider bursts.
  const CONCURRENCY = chunks.length === 1 ? 1 : 3;
  let processed = 0;

  for (let start = 0; start < chunks.length; start += CONCURRENCY) {
    const batch = chunks.slice(start, start + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(async (chunk) => {
      try {
        return { chunk, result: await callModel(chunk, env, customInstruction) };
      } catch (error) {
        console.error('Document extraction chunk failed; refusing to return a partial result.', error);
        return { chunk, error };
      }
    }));
    for (const item of batchResults) {
      if (item.result) {
        rawResponses.push(item.result.raw);
        modelsUsed.add(item.result.model);
        try {
          const parsed = extractJson(item.result.raw);
          const markerCount = item.chunk.split(/\r?\n/).map(line => line.trim()).filter(line => LITERAL_QUESTION_PATTERN.test(line)).length;
          const extractedCount = normalizeQuestions(parsed, allowedTypes).length;
          if (markerCount > extractedCount) throw new Error(`Expected at least ${markerCount} source questions in a chunk, got ${extractedCount}.`);
          parsedResults.push(parsed);
        } catch (error) {
          console.error('Document extraction response was incomplete or invalid.', error);
          chunkErrors.push(error);
        }
      } else {
        chunkErrors.push(item.error);
      }
      processed += 1;
      if (onProgress) {
        const currentQuestionCount = parsedResults.reduce((count, parsed) => count + normalizeQuestions(parsed, allowedTypes).length, 0);
        await onProgress({ processed, total: chunks.length, questionsExtracted: currentQuestionCount });
      }
    }
  }

  if (chunkErrors.length > 0) {
    const literalQuestions = normalizeQuestions(parseLiteralQuestions(normalizedText), allowedTypes, { preserveDuplicates: true });
    if (isReliableLiteralExtraction(normalizedText, literalQuestions)) {
      return {
        title: 'Extracted Quiz',
        description: 'Questions extracted from the uploaded document.',
        questions: literalQuestions.map((question, index) => ({ ...question, number: question.number || index + 1 })),
        rawResponses,
        chunks: chunks.length,
        provider: `${[...modelsUsed].join(', ') || 'none'}, local-format-parser`,
      };
    }
    throw new Error('لم تكتمل قراءة جميع أجزاء المستند؛ لم يتم إرجاع نتيجة جزئية قد تُسقط أسئلة. أعد المحاولة أو قسّم الملف.');
  }

  // Chunks are non-overlapping, so retaining duplicates here preserves repeated
  // question occurrences that are genuinely present in the source.
  const questions = parsedResults.flatMap(result => normalizeQuestions(result, allowedTypes));
  if (!questions.length) {
    const literalQuestions = normalizeQuestions(parseLiteralQuestions(normalizedText), allowedTypes, { preserveDuplicates: true });
    if (isReliableLiteralExtraction(normalizedText, literalQuestions)) {
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
