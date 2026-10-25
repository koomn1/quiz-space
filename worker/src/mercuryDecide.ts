export interface MercuryDecideEnv {
  INCEPTION_API_KEY?: string;
}

interface MercurySpan {
  text?: unknown;
  confidence?: unknown;
}

interface MercuryDecisionResponse {
  answers?: Record<string, any>;
}

export interface MercuryExtractedBlock {
  text: string;
  confidence: number | null;
}

const MERCURY_DECIDE_URL = 'https://api.inceptionlabs.ai/v1/decisions';
const MERCURY_TIMEOUT_MS = 25_000;
// Mercury Decide extract requests have a 32K-token limit. Keep a conservative
// character budget and process large documents in bounded sections.
const MERCURY_EXTRACT_CHUNK_CHARS = 100_000;

async function requestDecision(
  env: MercuryDecideEnv,
  state: unknown,
  questions: Record<string, unknown>,
): Promise<MercuryDecisionResponse | null> {
  if (!env.INCEPTION_API_KEY) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MERCURY_TIMEOUT_MS);
  try {
    const response = await fetch(MERCURY_DECIDE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.INCEPTION_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'mercury-decide', state, questions }),
    });
    if (!response.ok) throw new Error(`Mercury Decide failed: ${response.status}`);
    return await response.json() as MercuryDecisionResponse;
  } finally {
    clearTimeout(timeout);
  }
}

function spanText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const span = value as MercurySpan;
  return typeof span.text === 'string' ? span.text : '';
}

function splitForMercury(text: string): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < text.length;) {
    const targetEnd = Math.min(start + MERCURY_EXTRACT_CHUNK_CHARS, text.length);
    const boundary = targetEnd < text.length ? text.lastIndexOf('\n', targetEnd) : targetEnd;
    const end = boundary > start + 30_000 ? boundary : targetEnd;
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = Math.max(start + 1, end);
  }
  return chunks;
}

async function extractOneChunk(source: string, env: MercuryDecideEnv): Promise<MercuryExtractedBlock[]> {
  const criteria: Record<string, string> = {};
  for (let index = 1; index <= 26; index += 1) {
    criteria[`question_${index}`] = `The exact contiguous text of question ${index}, including its original number and all immediately associated answer choices. Return the original text only. If it is not present, mark it not stated.`;
  }
  const result = await requestDecision(env, { source }, {
    question_blocks: {
      type: 'extract',
      source: 'source',
      instructions: 'Extract complete numbered quiz question blocks exactly as written. Preserve wording, punctuation, line breaks, numbering, and choices. Never rewrite or summarize.',
      criteria,
    },
  });
  const blocks: MercuryExtractedBlock[] = [];
  const spans = result?.answers?.question_blocks?.spans;
  for (let index = 1; index <= 26; index += 1) {
    const candidates = spans && typeof spans === 'object'
      ? (spans as Record<string, unknown>)[`question_${index}`]
      : [];
    const span = (Array.isArray(candidates) ? candidates : [candidates])
      .find(candidate => Boolean(spanText(candidate)));
    const value = spanText(span);
    if (!value) continue;
    const confidence = span && typeof span === 'object' && typeof (span as MercurySpan).confidence === 'number'
      ? Number((span as MercurySpan).confidence)
      : null;
    blocks.push({ text: value, confidence });
  }
  return blocks;
}

/**
 * Mercury is the primary AI extractor when INCEPTION_API_KEY is configured.
 * The caller feeds the exact spans back into the strict local parser, while
 * this function keeps local parsing as the safe fallback if Mercury fails.
 */
export async function extractQuestionBlocksWithMercury(
  text: string,
  env: MercuryDecideEnv,
): Promise<MercuryExtractedBlock[]> {
  if (!env.INCEPTION_API_KEY || !text.trim()) return [];
  try {
    const extracted: MercuryExtractedBlock[] = [];
    for (const chunk of splitForMercury(text)) {
      extracted.push(...await extractOneChunk(chunk, env));
    }
    return extracted;
  } catch (error) {
    console.warn('Mercury Decide question extraction failed; preserving local and provider fallbacks.', error);
    return [];
  }
}

/** Mercury validates generated batches; it does not generate quiz prose. */
export async function assessGeneratedQuestionBatch(
  questions: unknown[],
  topic: string,
  env: MercuryDecideEnv,
): Promise<{ qualityProbability: number | null; needsReview: boolean }> {
  if (!env.INCEPTION_API_KEY || !questions.length) return { qualityProbability: null, needsReview: false };
  try {
    const result = await requestDecision(
      env,
      { topic, questions: questions.slice(0, 50) },
      {
        valid_batch: {
          type: 'noul',
          instructions: 'Does every generated item have a clear question, preserve the requested topic, and have valid answer choices when it is multiple choice? Do not judge factual correctness beyond the supplied topic.',
        },
      },
    );
    const probability = Number(result?.answers?.valid_batch?.noul);
    if (!Number.isFinite(probability)) return { qualityProbability: null, needsReview: false };
    return { qualityProbability: probability, needsReview: probability < 0.75 };
  } catch (error) {
    console.warn('Mercury Decide generation assessment failed; returning generated questions unchanged.', error);
    return { qualityProbability: null, needsReview: false };
  }
}
