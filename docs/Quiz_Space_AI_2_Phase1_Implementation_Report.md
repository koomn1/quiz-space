# Quiz Space AI 2.0 — Phase 1 implementation report

**Date:** 2026-11-11  
**Repository:** `koomn1/quiz-space`  
**Branch:** `codex/phase-1-rewards-security`  
**Pull request:** [#9 — Phase 1 security and extraction lifecycle](https://github.com/koomn1/quiz-space/pull/9)  
**Status:** Draft PR; database migrations applied to the connected Supabase project; web/Edge Function deployment and merge are not performed.

## 1. Executive summary

Phase 1 has moved from read-only audit into implementation. The work hardens extraction lifecycle handling, daily and standard quiz scoring, coupon redemption, rewards, identity binding, guest reviews, classroom notifications, and selected public profile RPCs.

The connected Supabase project has the relevant migrations recorded. Database smoke tests were executed inside transactions and rolled back. No test data was retained.

The branch remains isolated from `main`. The new web client and Edge Functions are not deployed. Legacy RPC revocations are staged in a post-deployment SQL script and must not be run until the new client is live.

## 2. Implemented changes

### 2.1 Extraction and Worker lifecycle
- Extraction job GET endpoints are read-only; polling no longer restarts processing or enqueues duplicate work.
- Queue scheduling reports explicit success/failure; inline fallback is used only when enqueue fails.
- Parent task IDs are carried through Vision child chunks.
- Parent task completion/failure is checked against the extraction job's terminal status, including inline fallback paths.
- Task Ledger handles successful Supabase RPC responses with empty bodies.
- Queue tests cover task ID propagation, successful/failed delivery, and authentication before enqueue.

### 2.2 Daily quiz integrity
- Membership tier is derived server-side from the authenticated user's effective membership; caller-supplied tier is ignored.
- Per-user slot and refresh RPCs use the server-resolved tier.
- Finalization requires an active refresh claim and validates the quiz ID/window and bank.
- Daily questions are generated from a server-owned active bank and linked to a server-owned `bank_id`.
- The public quiz payload does not include the correct answer index.
- Answer selections are submitted to the database; score and rewards are calculated against private answer-key rows.
- The connected database currently has **10 active banks and 50 answer-key rows**; all 10 active banks have complete answer-key coverage.

### 2.3 Standard quiz scoring (authenticated and guest)
- New `submit_quiz_attempt_v2` and `submit_guest_quiz_attempt_v2` RPCs accept answer selections, not a client-computed score.
- The server reads the stored quiz questions and calculates objective scores from the stored answer indexes.
- Invalid answer indexes are rejected; malformed/missing answer keys are not awarded as correct.
- Essay answers are saved separately and attempts containing essays are held for creator review; essay points are not accepted from the client.
- The authenticated submission now records completion and invokes the canonical reward ledger atomically, avoiding a second XP award from the client.
- The web client sends answer arrays for authenticated and guest attempts.
- The Flutter mobile Edge Function also grades against stored answer indexes and rejects answer arrays whose length does not match the quiz.

**Important limitation:** Standard quiz question JSON still contains answer fields in the client-visible quiz payload. Score-write integrity is now server-authoritative, but full answer-key confidentiality for standard quizzes requires a separate migration to move those keys into a private table and update creator/taker retrieval flows.

### 2.4 Coupons and subscription plans
- The legacy coupon RPC delegates to a server-authoritative function.
- Plan name and renewal date are derived from the canonical plan row; client-supplied plan name/renewal date are ignored.
- The connected database previously had no paid plan rows. Three canonical monthly plans are now seeded from `src/components/BillingSection.tsx`:
  - Silver Scholar — 150 EGP / 1 month
  - Educator Gold — 300 EGP / 1 month
  - Diamond Elite VIP — 1,500 EGP / 1 month
- Reward purchase checks effective membership and canonical plan entitlement instead of trusting a stale plan label.

### 2.5 Identity and progression
- Direct user updates to protected identity/progression fields are restricted.
- Trusted subscription/progression changes use explicit transaction-local guards.
- Firebase identity links are persisted and protected against duplicate Firebase identities.
- Legacy email resolution rejects ambiguous duplicate addresses instead of selecting a profile arbitrarily.

### 2.6 Guest reviews, profiles, and notifications
- Guest review updates require the per-attempt key; the client uses the new v2 review RPC.
- Saved quiz review is read-only in the new client; client helpers for post-completion score rewriting were removed.
- Public profile RPCs no longer return location.
- Security-definer search paths are pinned for the reviewed public/guest functions.
- Classroom membership helpers verify that the caller is the same user whose membership is being checked.
- Classroom-wide push notifications are limited to the owner, authorized teacher/member, admin, or trusted cron. Ordinary students cannot broadcast to all classroom members.

### 2.7 Flutter integration and CI
- Flutter AI calls now target the Worker route that exists in the repository.
- Android CI pins Java 17 for Gradle.
- The mobile Firebase session Edge Function is included in Deno typechecking.
- Mobile quiz scoring uses stored answer indexes and exact answer-count validation.

## 3. Supabase migrations applied

The connected Supabase project records these versions:

| Version | Migration |
|---|---|
| `20261110194201` | daily quiz tier authority hardening |
| `20261110194227` | lock daily quiz RPC execute |
| `20261110194413` | retire legacy daily quiz RPCs |
| `20261110211548` | secure daily quiz scoring |
| `20261110212112` | bind daily quiz slot to server bank |
| `20261110212156` | purge legacy daily quiz payloads |
| `20261110212423` | server-authoritative coupon redemption |
| `20261110212634` | protect user progression and identity |
| `20261110212714` | harden reward purchase plan authority |
| `20261110212740` | allow trusted subscription writes |
| `20261110213014` | persist mobile Firebase identity links |
| `20261110213058` | prevent duplicate mobile identity links |
| `20261110213149` | lock mobile identity email resolution |
| `20261110213904` | allow trusted progression updates |
| `20261110214338` | harden public profile and classroom helpers |
| `20261110214552` | secure guest review attempt key |
| `20261110214733` | fix remaining function search paths |
| `20261111054101` | seed canonical subscription plans |
| `20261111054631` | server-authoritative standard quiz scoring |
| `20261111054841` | fix quiz scoring output-column ambiguity |
| `20261111055053` | make quiz scoring rewards atomic |

Repository migration filenames are aligned with the versions recorded by Supabase to avoid duplicate application by a later `db push`.

## 4. Database verification

The following smoke tests ran inside transactions and were rolled back:

1. **Daily quiz:** claim refresh → finalize from server bank → submit answer array. All-null answers scored zero and the server returned a complete answer-key response for review.
2. **Daily tier tampering:** an inactive account requested the Diamond tier; the created slot remained Free.
3. **Standard quiz scoring:** authenticated and guest v2 submissions produced the same score as the database scoring helper from stored questions; essay attempts entered creator review.
4. **Invalid answer selection:** an out-of-range option index was rejected.
5. **Coupon tampering:** the legacy coupon RPC received a fake Diamond plan name and a 2099 renewal date; the database applied the canonical Silver plan and calculated its own renewal date.
6. **Guest review:** the correct per-attempt key was accepted and an incorrect key was rejected.
7. **Canonical plans:** three active paid plan rows are present.

## 5. CI verification

- The Phase 1 workflow has previously passed all unit/contract tests, application TypeScript, production build, Deno checks for changed Edge Functions, and Worker TypeScript.
- A newer run after adding standard scoring and the Flutter scoring contract is in progress: [latest Phase 1 checks](https://github.com/koomn1/quiz-space/actions).
- Mobile Flutter CI is also running against the current branch; its final result must be checked before merge.

Do not treat a queued/in-progress workflow as a pass.

## 6. Security Advisor snapshot

After the applied database changes, the Supabase Security Advisor reported:
- 5 RLS-enabled tables without policies (informational; direct anon/auth table grants were separately checked).
- 14 anon-executable SECURITY DEFINER functions.
- 125 authenticated-executable SECURITY DEFINER functions.
- 1 leaked-password-protection warning.

Reviewed functions have pinned search paths. Remaining public SECURITY DEFINER functions require individual review; this report does not describe the advisor as clean or risk-free.

## 7. Deployment gate — do not skip

The file `supabase/post_deploy/revoke_legacy_daily_quiz_rpcs.sql` contains revocations for eight legacy RPCs:
- three legacy daily-quiz slot/finalize/score functions;
- the legacy guest-review function;
- two legacy post-completion score-edit functions;
- the old authenticated and guest quiz-submission functions that accept `p_score`.

**Do not run that script yet.** Running it before the new web client is deployed would break existing clients.

Required order:
1. Review and merge PR #9.
2. Deploy the new web client and updated Edge Functions.
3. Verify the deployed web client uses daily and standard quiz v2 submission RPCs and the guest-review v2 RPC.
4. Run the post-deploy revocation script.
5. Verify the eight old RPCs are no longer executable by `anon` or `authenticated`.

No merge, web deployment, or Edge Function deployment has been performed.

## 8. Remaining work

- Move standard quiz answer keys out of the client-visible `quizzes.questions` JSON before claiming answer-key confidentiality.
- Verify latest Phase 1 and Mobile CI results for the current HEAD.
- Review remaining SECURITY DEFINER functions individually.
- Complete post-deploy legacy RPC revocation after the new client is live.
- Continue the next platform-wide AI/extraction review slices after Phase 1 acceptance.
