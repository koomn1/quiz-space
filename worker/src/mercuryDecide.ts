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
): Promise<string[]> {
  if (!env.INCEPTION_API_KEY || !text.trim()) return [];
  const questions: Record<string, unknown> = {};
  for (let index = 1; index <= 26; index += 1) {
    questions[`question_${index}`] = {
      type: 'extract',
      criteria: {
        question_block: `The exact contiguous text of question ${index}, including its original number and all immediately associated answer choices. Return the original text only. If it is not present, mark it not stated.`,
      },
    };
  }

  try {
    const result = await requestDecision(env, { source: text.slice(0, 500_000) }, questions);
    const blocks: string[] = [];
    for (let index = 1; index <= 26; index += 1) {
      const answer = result?.answers?.[`question_${index}`];
      const spans = answer?.spans;
      const candidates = spans && typeof spans === 'object'
        ? Object.values(spans as Record<string, unknown>)
        : [];
      const value = candidates
        .flatMap(candidate => Array.isArray(candidate) ? candidate : [candidate])
        .map(spanText)
        .find(Boolean);
      if (value) blocks.push(value);
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
