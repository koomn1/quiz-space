export interface MercuryDecideEnv {
  INCEPTION_API_KEY?: string;
}

interface MercurySpan {
  text?: unknown;
  start?: unknown;
  end?: unknown;
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

/**
 * Extracts up to 26 contiguous question blocks without rewriting them.
 * Mercury Decide is only a fallback; the local parser remains authoritative
 * whenever the source already has a reliable question layout.
 */
export async function extractQuestionBlocksWithMercury(
  text: string,
  env: MercuryDecideEnv,
): Promise<MercuryExtractedBlock[]> {
  if (!env.INCEPTION_API_KEY || !text.trim()) return [];
  const criteria: Record<string, string> = {};
  for (let index = 1; index <= 26; index += 1) {
    criteria[`question_${index}`] = `The exact contiguous text of question ${index}, including its original number and all immediately associated answer choices. Return the original text only. If it is not present, mark it not stated.`;
  }

  try {
    const result = await requestDecision(env, { source: text.slice(0, 500_000) }, {
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
      if (value) {
        const confidence = span && typeof span === 'object' && typeof (span as MercurySpan & { confidence?: unknown }).confidence === 'number'
          ? Number((span as MercurySpan & { confidence: number }).confidence)
          : null;
        blocks.push({ text: value, confidence });
      }
    }
    return blocks;
  } catch (error) {
    console.warn('Mercury Decide question extraction failed; preserving other extraction fallbacks.', error);
    return [];
  }
}

/**
 * Validates a generated batch as a decision, never as a replacement generator.
 * A failed or unavailable decision leaves the generated quiz untouched.
 */
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
