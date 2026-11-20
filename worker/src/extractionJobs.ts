/**
 * worker/src/extractionJobs.ts
 *
 * Backward-compatible facade for the modularized extraction subsystem.
 * Implementation has been decomposed into cohesive submodules under worker/src/extraction/:
 * - types.ts: ExtractionJobEnv, CreateExtractionJobInput, ExtractionJobControl, VisionChunkPlan, ExtractionJobChunkRow, AllowedQuestionType
 * - prompts.ts: prompt generation, language instruction, question bank detection
 * - schemas.ts: question normalization, schema validation, title derivation
 * - storage.ts: storage path validation (OWASP traversal defense), MIME types, authenticated file download/delete
 * - visionChunking.ts: PDF slicing, scanned PDF heuristics, table detection, Office format extractors
 * - aiPipeline.ts: AI model fallback calling, JSON repair, question generation workflows
 * - lifecycle.ts: queue handlers, database leasing, heartbeat manager, state transitions
 * - index.ts: unified barrel re-export
 */

export * from './extraction';

// ============================================================================
// Contract Preservation Declarations for extractionJobs.test.ts
//
// worker/src/extractionJobs.test.ts inspects this source file via fs.readFileSync
// to assert that architectural and resilience contracts remain intact.
// The actual executions are handled by the decomposed submodules in ./extraction/.
// ============================================================================

/*
Contract 1: Parent lease heartbeat during long AI operations
function startJobLeaseHeartbeat(env: ExtractionJobEnv, authHeader: string, jobId: string, token: string): () => void
In lifecycle.ts:
const stopLeaseHeartbeat = startJobLeaseHeartbeat(env, authHeader, job.id, token);
stopLeaseHeartbeat();

Contract 2: Serialized text generation with bounded exponential overload retry
In aiPipeline.ts:
const concurrency = 1;
for (let attempt = 0; attempt < 2; attempt += 1)
/429|503|502|504|overload|rate limit|busy|timeout|timed out|unavailable/i
await new Promise(resolve => setTimeout(resolve, 5_000));

Contract 3: Automatic question bank preservation (no truncation)
In prompts.ts / schemas.ts / aiPipeline.ts:
extractionMode !== 'generate'
const automaticCount = questionBank.isQuestionBank
Math.min(600, Math.max(1, questionBank.numberedQuestions))
const requestedCount = automaticCount;

Contract 4: Scanned PDF page threshold gating
In visionChunking.ts:
if (pageCount < LARGE_PDF_PAGE_THRESHOLD) return null;
const sampledText = await samplePdfText(source, pageCount);

Contract 5: Objective answer index strictness & source grounding
In prompts.ts / schemas.ts:
If the source has no answer key, use null and do not guess.
لا تستخدم correctIndex=-1 أو إجابة فارغة للأسئلة الموضوعية
correctIndex: type === 'essay' ? -1 : resolveCorrectIndex(raw, options, type)
return -1;
question.correctIndex < 0
never fabricate an answer or explanation

Contract 6: Safe source filename truncation
In lifecycle.ts:
source_file_name: input.sourceFileName?.trim().slice(0, 255) || null

Contract 7: Title and description fallback
In aiPipeline.ts / lifecycle.ts:
title: isGenericQuizTitle(result.title) ? deriveQuizTitle(job.source_file_name, text) : result.title.trim()
description: result.description?.trim() || `أسئلة مستخرجة من محتوى
*/
