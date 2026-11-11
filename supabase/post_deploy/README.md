# Post-deployment SQL — daily quiz legacy RPC retirement

This script is intentionally outside `supabase/migrations` because it must run **after** the new web client is deployed. The currently deployed client still calls the legacy daily-quiz RPC signatures.

## Required order

1. Merge and deploy the updated web application from the Phase 1 branch.
2. Verify that the deployed application calls `get_user_daily_quiz_slot_v2`, `finalize_user_daily_quiz_refresh_v2`, and `submit_user_daily_quiz_attempt_v2`.
3. Run `revoke_legacy_daily_quiz_rpcs.sql` against the production Supabase project.
4. Verify that all eight legacy RPCs (three daily-quiz functions, guest review, two score-edit functions, and two client-scored quiz submission functions) are no longer executable by `authenticated` or `anon`.

Do not run this script before step 1; it will break daily challenges in the old deployed client.

The new v2 functions derive membership tier on the server, generate questions from the private bank, bind slots to a server-owned `bank_id`, and grade both daily and standard quiz answer arrays against server-stored answer keys.
