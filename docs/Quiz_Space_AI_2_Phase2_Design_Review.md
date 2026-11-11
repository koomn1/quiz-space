# Quiz Space AI 2.0 — Phase 2 Design Review

Date: 2026-11-11
Branch: `codex/phase-2-answer-key-ai-quotas`
Base: `codex/phase-1-rewards-security`

## Scope

Phase 2 follows Phase 1 and addresses:
1. Standard quiz answer-key confidentiality across web and Flutter.
2. Server-side AI usage limits and entitlement enforcement.
3. Tests that prove unauthorized clients cannot retrieve answer keys or bypass quotas.

No production schema or deployment changes are made by this review document.

## Confirmed findings

### A. Standard quiz answer keys are still public

- `public.quizzes` has an RLS SELECT policy named `quizzes_read` with `USING (true)`.
- `public.quizzes.questions` is JSONB and currently contains `correctIndex`, `correctAnswer`, and sometimes explanations.
- The browser's `getQuizzes()` and `getQuizById()` currently use direct `.from('quizzes').select('*')`; these are the central public read points to replace.
- The web resolver uses question answer fields for immediate local scoring and review.
- The mobile Firebase Edge Function `mobile-firebase-session-v2` reads the full question JSON, computes objective score server-side, and calls `submit_mobile_quiz_attempt`; the RPC is executable only by `service_role`, not `anon` or `authenticated`. The mobile read/create paths still need to be moved to the new sanitized/private-key contract.
- The creator editor also needs answer keys to reopen and edit an owned quiz.
- Standard authenticated and guest scoring RPCs already compute objective score server-side, but currently read the answers from `quizzes.questions`.

Consequence: server-authoritative score calculation prevents client score forgery, but does not provide answer confidentiality while the public SELECT policy returns the JSONB answer fields.

### B. Existing AI access checks are not usage quotas

- Worker routes `/api/ai/chat` and `/api/ai/chat/stream` resolve the caller identity and load effective membership context.
- `getCosmoAccountContext()` injects membership status into the model prompt; this is not an authorization or quota enforcement boundary.
- The Worker had an in-memory limit of 40 requests per minute keyed by client IP. It was isolate-local and reset with the isolate. Phase 2 now scopes this IP burst guard to AI POST routes only; it remains a secondary burst control, not a durable account quota.
- The database has `ai_performance_logs` for telemetry, but no dedicated AI quota/usage ledger table was found in the public schema.
- The current QuizCreator UI does define generation allowances, but enforces them only in browser localStorage: Free users get 3/day for topic generation and pasted-text generation; Silver/Gold/Diamond are unlimited for those two modes. File OCR is 3/day for Free and Silver, while Gold/Diamond are unlimited. These are UI rules, not server-authoritative quotas, and can be reset/bypassed by clearing storage or calling Worker routes directly.
- No dedicated AI quota ledger table or server-side atomic quota RPC exists yet. Cosmo chat itself has no defined daily cap in the inspected UI; paid-only explain/essay routes already have separate effective-membership checks.

### Live data inventory (connected Supabase project)

Read-only inspection on 2026-11-11 found:

- 73 standard quiz rows.
- 2,970 total questions: 2,836 objective questions and 134 essays.
- All 2,970 rows have a question id and a `correctIndex` property.
- 2 objective questions have an invalid answer index (`-1` on True/False questions) and need creator review; they must not be silently assigned a guessed answer during migration. They are in quiz ids `quiz-4c29hf7to` and `quiz-fo4tvkrg8`.
- 103 essay questions have no reference `correctAnswer`; these must remain valid manual-review essays and must not be blocked by objective-answer migration.
- 1,932 questions contain non-empty explanations. Explanations should be released after submission with the answer review, not as part of the public pre-attempt payload.
- No unknown question types or duplicate question ids within a quiz were found in the current sample.

These counts make a transactional migration feasible, but it must explicitly preserve unresolved items and validate the answer-key coverage before the public JSON is sanitized. A read-only SQL preflight script is included at `supabase/tests/quiz_answer_key_confidentiality_preflight.sql`.


## Phase 2 implementation checkpoint (2026-11-11)

The first answer-key isolation slice is now implemented on this branch:

- Added `private.quiz_answer_keys` in migration `20261111073000_private_quiz_answer_keys.sql`.
- A database trigger captures keys and explanations on quiz insert/update, then strips answer indexes, answer text, and explanations from `public.quizzes.questions`.
- Existing quiz rows are backfilled through the same trigger. Invalid legacy keys are stored as unresolved (NULL), never guessed.
- The standard scoring helper now grades by the private `(quiz_id, question_id)` key and fails closed when an objective question has an unresolved key.
- Added owner-only editor retrieval RPC `get_owned_quiz_with_answers`.
- Added authenticated and guest post-submission review RPCs, each bound to the saved completion/attempt.
- Added `submit_mobile_quiz_attempt_v2`, restricted to `service_role`; the mobile Firebase Edge Function normalizes selected answers and no longer calculates the score from client-visible question JSON.
- Web creator editing now fetches answer keys through the owner-only RPC. The web resolver no longer reveals correctness locally and retrieves answer review only after a saved completion.
- Added SQL smoke coverage and updated web/mobile contract tests.

### Validation performed

- Executed the complete migration and SQL smoke test together inside a transaction against the connected Supabase project, then rolled the transaction back.
- The dry run completed successfully with no persistent schema or data changes.
- The smoke test verified that public question JSON contains no answer fields, private key rows are created, valid answers are scored from private storage, unresolved keys fail closed, and API roles cannot directly SELECT the private table.

### Important remaining integration work

- The two existing invalid objective keys (`correctIndex = -1`) must be corrected by their quiz owners before those quizzes can be submitted after cutover.
- The mobile app currently displays the saved score but does not yet show a detailed correct-answer review; its scoring path is now server-authoritative.
- The existing client direct-write quiz creation/update paths rely on the database trigger to split keys. This is intentional for compatibility, but the next security review must verify no alternate write path can bypass the trigger.
- AI quota enforcement remains a separate workstream; no per-plan usage numbers have been invented or activated.

**Deployment status:** This migration has only been dry-run transactionally. It has NOT been applied to production. No web/Worker deployment, PR merge, or legacy RPC revocation has occurred.

## Recommended implementation design

### 1. Answer-key separation

Use a non-exposed schema (for example `private`) for answer keys, not a publicly selectable JSONB column.

- Keep `public.quizzes.questions` as question content only: id, type, text, options, media, and other non-answer metadata.
- Move `correctIndex`, `correctAnswer`, and answer-only explanation fields into a private per-question answer-key table keyed by quiz id and question id.
- Use owner-checked database functions for creator draft retrieval and quiz create/update. Never trust a client-supplied creator id.
- Change public quiz reads to a safe RPC or safe view that cannot return private answer fields.
- Change `submit_quiz_attempt_v2` and `submit_guest_quiz_attempt_v2` to grade against the private answer-key table.
- Return answer review only after a successful submission, and only to the attempt owner (or the guest attempt holder using its attempt key). Creator review remains owner-only.
- Preserve essay answers and manual grading workflow separately; never treat an essay model answer as an objective answer index.
- Migrate existing rows transactionally and verify every objective question has exactly one valid answer-key row before stripping the legacy JSON fields.
- Keep a compatibility window for old clients; do not revoke legacy RPCs until the new web and mobile clients are deployed and verified.

### 2. AI quota enforcement

Preserve the existing product rules but move their enforcement from browser storage to a durable server-side quota ledger:

| Operation | Free | Silver | Gold / Diamond |
|---|---:|---:|---:|
| Topic generation | 3 per UTC day | Unlimited | Unlimited |
| Pasted-text generation | 3 per UTC day | Unlimited | Unlimited |
| File OCR / document extraction | 3 per UTC day | 3 per UTC day | Unlimited |
| Cosmo chat | No daily allowance found in current UI | No daily allowance found | No daily allowance found |

- The first three rows are grounded in the current QuizCreator UI; today they are stored in localStorage and therefore are not security controls.
- Derive the tier from the server's effective membership record (is_premium, plan name, renewal date, lifetime/founder status). Never trust the client userPlan.
- Implement an atomic daily usage ledger keyed by authenticated user (and a privacy-preserving IP hash for guests), operation, and UTC date.
- Generation currently fans out into multiple Worker requests for one UI action. Quota accounting must reserve one generation session and bind subsequent batch requests to that reservation, with a maximum question budget, rather than charging every batch or trusting a reusable client idempotency key.
- File extraction jobs already have idempotency keys; retries and polling must not consume additional daily quota.
- Keep the IP burst guard as a separate short-window control. It is now scoped to AI POST routes, but remains isolate-local.
- Fail closed if authoritative quota state cannot be checked. The Worker must have a server-only service credential for the quota RPC; deployment must verify that secret exists before enabling enforcement.
- Keep chat quota policy separate until a product limit is defined; do not infer one from the UI's generation quotas.

Use a durable server-side usage ledger and an atomic quota-consumption RPC (or an equivalent durable Cloudflare primitive). Do not use the in-memory Map as the authoritative quota.

- Authenticate the request before quota consumption.
- Derive membership and effective entitlement server-side; ignore client `isPremium`, plan labels, and requested model names for authorization.
- Count both standard and streaming chat routes in the same quota bucket; count expensive multimodal/extraction operations separately if their cost profile requires it.
- Apply rate limiting only to the routes it is intended to protect.
- Keep IP-based burst protection as a secondary abuse control, not the account quota.
- Fail closed if authoritative quota state cannot be checked for authenticated requests.
- Record operation, user, plan tier at time of request, allowance, and UTC window in a way that supports audit and support.
- Do not pick numerical free/Silver/Gold/Diamond allowances until product policy is confirmed; keep thresholds configurable rather than hard-coded in the Worker.

## Acceptance criteria

- Anonymous users cannot select any answer-key table or function.
- Authenticated non-creators cannot retrieve a quiz's answer key before submission.
- Quiz creators can retrieve answer keys only for quizzes they own (or admin-authorized records).
- Both web and guest scoring are calculated from private answer keys.
- Correct-answer review is returned only after a valid submission and is bound to the submitted attempt.
- Web and Flutter create/edit/read paths continue to work with the sanitized public quiz contract.
- AI quota consumption is atomic under concurrent requests and shared across Worker isolates.
- Client-provided plan fields cannot raise a user's allowance.
- Both `/api/ai/chat` and `/api/ai/chat/stream` enforce the same entitlement and usage policy.
- Unit, contract, SQL smoke, and integration tests cover allowed, denied, concurrent, expired-window, guest, paid, and membership-expiry cases.

## Execution order

1. Inventory every web/mobile quiz read, create, edit, submit, and review path.
2. Implement the private answer-key schema and database RPCs on this development branch.
3. Add migration/backfill validation and SQL smoke tests; do not apply production migration until the client changes and tests are ready.
4. Update web and Flutter contracts together; keep the old public contract temporarily compatible only where required.
5. Implement durable AI quota storage and server enforcement after quota values and guest policy are agreed.
6. Run full web, Worker, Deno, Flutter, and database verification.
7. Deploy clients and Worker, verify production behavior, then revoke legacy RPCs in the post-deploy step.

## Explicit non-actions

- No merge to `main`.
- No Cloudflare Pages or Worker deployment.
- No Supabase production schema changes in this phase review.
- No legacy RPC revocation.
- No invented per-plan AI quotas.
