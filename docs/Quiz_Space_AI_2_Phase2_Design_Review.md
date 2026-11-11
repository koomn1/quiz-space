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
- `getQuizzes()` and `getQuizById()` currently use direct `.from('quizzes').select('*')`.
- The web resolver uses question answer fields for immediate local scoring and review.
- The creator editor also needs answer keys to reopen and edit an owned quiz.
- Standard authenticated and guest scoring RPCs already compute objective score server-side, but currently read the answers from `quizzes.questions`.

Consequence: server-authoritative score calculation prevents client score forgery, but does not provide answer confidentiality while the public SELECT policy returns the JSONB answer fields.

### B. Existing AI access checks are not usage quotas

- Worker routes `/api/ai/chat` and `/api/ai/chat/stream` resolve the caller identity and load effective membership context.
- `getCosmoAccountContext()` injects membership status into the model prompt; this is not an authorization or quota enforcement boundary.
- The Worker has an in-memory limit of 40 requests per minute keyed by client IP. It is isolate-local, resets with the isolate, and is not a durable per-user or per-plan allowance.
- The current rate-limit check runs before route dispatch, so it also counts non-AI requests such as polling and other Worker endpoints.
- The database has `ai_performance_logs` for telemetry, but no dedicated AI quota/usage ledger table was found in the public schema.
- No authoritative per-plan Cosmo request allowance was found in the inspected billing/UI code. Exact free/paid limits must be agreed before enabling product-facing quota enforcement.

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
