# SECURITY DEFINER audit (static, from migration files)

Scope: `supabase/migrations/*.sql` only. No live database was queried or changed. The Supabase Advisor
report (118 warnings, 109 SECURITY DEFINER) was not re-run, so counts below come from reading the files.

## What was checked
- 149 SECURITY DEFINER functions found in the migration files.
- `search_path`: the baseline migration sets one on every function in `public`/`app` that lacked it
  (DO block near line 3900), so no function should have a mutable search path.
- Authorization: functions taking `p_user_id` were checked for `auth.uid()` / admin / service_role checks
  or an EXECUTE revoke. `enroll_in_season` was re-checked: the later definition (baseline ~line 3559)
  verifies `auth.uid() = p_user_id`, so it is fine.

## Findings
1. No missing-auth hole found in the functions read. The heuristic flagged a few that need a human look
   (a text scan can be wrong): `is_classroom_owner`, `is_classroom_student_member` (RLS helpers, boolean only),
   `get_public_verification_badge` (intentionally public).
2. Trigger functions that are SECURITY DEFINER keep the default PUBLIC EXECUTE:
   `protect_privileged_user_columns`, `sync_quiz_total_plays`, `capture_quiz_answer_keys`,
   `delete_quiz_answer_keys`. Clients never call these. Revoking is safe. Proposed in
   `supabase/proposed/20261127_revoke_execute_on_trigger_and_helper_functions.sql`.
3. Guest-facing RPCs (`submit_guest_quiz_attempt*`, `get_public_*`, `get_guest_quiz_answer_review`,
   `update_guest_quiz_attempt_*`) are granted to anon on purpose. These are the largest remaining
   attack surface. Each should be reviewed for rate limits, input size limits and what it returns.
4. The remaining Advisor warnings are most likely "authenticated can execute SECURITY DEFINER function".
   That is expected for RPCs the app calls. Reduce only after confirming which RPCs the client actually uses.

## Not done / needs a database
- Running the Advisor and `pg_proc`/`has_function_privilege` queries against staging to get the real list.
- RLS policy tests per table (suggest pgTAP files in `supabase/tests`).
