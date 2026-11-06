import type { ExtractedQuestion, ExtractedOption } from './types/extraction';
import { normalizeDisplayText } from './fsmQuestionParser';

export interface MercuryPatchPayload {
  confirmedQuestionIds?: string[];
  repairedQuestions?: ExtractedQuestion[];
  recoveredMissedQuestions?: ExtractedQuestion[];
  answerKeyMappings?: Record<string, string>;
  chunkWarnings?: string[];
}

export interface MercuryVerificationResult {
  mergedQuestions: ExtractedQuestion[];
  warnings: string[];
}

const MAX_RECOVERED_PER_CHUNK = 40;
const MAX_OPTIONS_PER_QUESTION = 12;
const MAX_TEXT_LENGTH = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isPageList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(page => Number.isInteger(page) && page >= 1);
}

function isOption(value: unknown): value is ExtractedOption {
  if (!isRecord(value)) return false;
  return isString(value.letter) && isString(value.text) && isString(value.rawSpan);
}

function isQuestion(value: unknown): value is ExtractedQuestion {
  if (!isRecord(value)) return false;
  return isString(value.id)
    && isString(value.rawNumber)
    && isString(value.rawSpan)
    && isString(value.stem)
    && value.stem.length <= MAX_TEXT_LENGTH
    && Array.isArray(value.options)
    && value.options.length <= MAX_OPTIONS_PER_QUESTION
    && value.options.every(isOption)
    && (value.correctAnswer === null || isString(value.correctAnswer))
    && isPageList(value.sourcePages)
    && isString(value.origin)
    && isString(value.status)
    && typeof value.confidence === 'number'
    && Array.isArray(value.warnings)
    && value.warnings.every(isString);
}

function validatePatch(value: unknown): { patch: MercuryPatchPayload | null; warnings: string[] } {
  if (!isRecord(value)) return { patch: null, warnings: ['رد Mercury ليس كائن JSON صالحًا'] };
  const warnings: string[] = [];
  const repaired = value.repairedQuestions;
  const recovered = value.recoveredMissedQuestions;
  const confirmed = value.confirmedQuestionIds;
  const mappings = value.answerKeyMappings;
  if (repaired !== undefined && (!Array.isArray(repaired) || !repaired.every(isQuestion))) {
    warnings.push('تم رفض repairedQuestions لعدم مطابقة العقد');
  }
  if (recovered !== undefined && (!Array.isArray(recovered) || !recovered.every(isQuestion))) {
    warnings.push('تم رفض recoveredMissedQuestions لعدم مطابقة العقد');
  }
  if (confirmed !== undefined && (!Array.isArray(confirmed) || !confirmed.every(isString))) {
    warnings.push('تم تجاهل confirmedQuestionIds غير الصالح');
  }
  if (mappings !== undefined && (!isRecord(mappings) || Object.values(mappings).some(answer => !isString(answer)))) {
    warnings.push('تم تجاهل answerKeyMappings غير الصالح');
  }
  const patch: MercuryPatchPayload = {
    confirmedQuestionIds: Array.isArray(confirmed) && confirmed.every(isString) ? confirmed : [],
    repairedQuestions: Array.isArray(repaired) && repaired.every(isQuestion) ? repaired : [],
    recoveredMissedQuestions: Array.isArray(recovered) && recovered.every(isQuestion) ? recovered : [],
    answerKeyMappings: isRecord(mappings) && Object.values(mappings).every(answer => isString(answer))
      ? mappings as Record<string, string>
      : {},
    chunkWarnings: Array.isArray(value.chunkWarnings) && value.chunkWarnings.every(isString) ? value.chunkWarnings : [],
  };
  return { patch, warnings };
}

function normalizedTokens(value: string): string[] {
  return normalizeDisplayText(value)
    .toLocaleLowerCase()
    .split(/\s+/)
    .map(token => token.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ''))
    .filter(token => token.length >= 2);
}

function isTraceableToRawText(candidate: string, raw: string): boolean {
  const normalizedCandidate = normalizeDisplayText(candidate).toLocaleLowerCase();
  const normalizedRaw = normalizeDisplayText(raw).toLocaleLowerCase();
  if (!normalizedCandidate || !normalizedRaw) return false;
  if (normalizedRaw.includes(normalizedCandidate)) return true;
  const candidateTokens = normalizedTokens(candidate);
  const rawTokens = normalizedTokens(raw);
  if (candidateTokens.length < 3) return false;
  let cursor = 0;
  let matched = 0;
  for (const token of candidateTokens) {
    const next = rawTokens.indexOf(token, cursor);
    if (next < 0) continue;
    matched += 1;
    cursor = next + 1;
  }
  return matched / candidateTokens.length >= 0.75;
}

function pagesWithinRange(pages: number[], range: [number, number]): boolean {
  return pages.length > 0 && pages.every(page => page >= range[0] && page <= range[1]);
}

function cloneQuestion(question: ExtractedQuestion): ExtractedQuestion {
  return {
    ...question,
    options: question.options.map(option => ({ ...option })),
    sourcePages: [...question.sourcePages],
    warnings: [...question.warnings],
  };
}

export function validateAndApplyMercuryPatch(
  localChunkQuestions: ExtractedQuestion[],
  chunkRawText: string,
  chunkPageRange: [number, number],
  rawMercuryResponse: unknown,
): MercuryVerificationResult {
  const parsed = validatePatch(rawMercuryResponse);
  const warnings = [...parsed.warnings];
  if (!parsed.patch) return { mergedQuestions: localChunkQuestions.map(cloneQuestion), warnings };
  const patch = parsed.patch;
  warnings.push(...(patch.chunkWarnings || []).slice(0, 20));
  const merged = new Map(localChunkQuestions.map(question => [question.id, cloneQuestion(question)]));

  for (const repaired of patch.repairedQuestions || []) {
    const original = merged.get(repaired.id);
    if (!original) {
      warnings.push(`تم تجاهل إصلاح Mercury لسؤال غير موجود: ${repaired.id}`);
      continue;
    }
    if (original.status === 'confirmed') {
      warnings.push(`تم منع Mercury من تعديل السؤال المؤكد ${original.rawNumber}`);
      continue;
    }
    if (!pagesWithinRange(repaired.sourcePages, chunkPageRange)) {
      warnings.push(`تم رفض صفحات السؤال المُصلح ${original.rawNumber} لأنها خارج نطاق الـChunk`);
      continue;
    }
    if (!isTraceableToRawText(repaired.stem, chunkRawText)
      || repaired.options.some(option => !isTraceableToRawText(option.text, chunkRawText))) {
      warnings.push(`تم رفض إصلاح السؤال ${original.rawNumber} لعدم إمكانية تتبع نصه`);
      continue;
    }
    merged.set(original.id, {
      ...original,
      stem: normalizeDisplayText(repaired.stem),
      options: repaired.options.map(option => ({ ...option, text: normalizeDisplayText(option.text) })),
      correctAnswer: repaired.correctAnswer ?? original.correctAnswer,
      sourcePages: [...repaired.sourcePages],
      origin: 'mercury_verified',
      status: 'confirmed',
      confidence: Math.min(100, Math.max(0, repaired.confidence || 95)),
    });
  }

  const recovered = patch.recoveredMissedQuestions || [];
  if (recovered.length > MAX_RECOVERED_PER_CHUNK) {
    warnings.push(`تم رفض recoveredMissedQuestions لتجاوز الحد ${MAX_RECOVERED_PER_CHUNK}`);
  } else {
    for (const question of recovered) {
      if (!pagesWithinRange(question.sourcePages, chunkPageRange)
        || !isTraceableToRawText(question.stem, chunkRawText)
        || question.options.some(option => !isTraceableToRawText(option.text, chunkRawText))) {
        warnings.push(`تم استبعاد سؤال Mercury مسترجع غير قابل للتتبع: ${question.rawNumber}`);
        continue;
      }
      const id = `mercury-recovered-${question.sourcePages[0]}-${question.rawNumber}`;
      if (merged.has(id)) continue;
      merged.set(id, {
        ...cloneQuestion(question),
        id,
        rawSpan: question.rawSpan || question.stem,
        origin: 'mercury_recovered',
        status: 'confirmed',
        confidence: Math.min(100, Math.max(0, question.confidence || 90)),
      });
    }
  }

  return { mergedQuestions: [...merged.values()], warnings };
}
