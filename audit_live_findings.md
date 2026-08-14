# Live Audit Findings — 2026-08-14

- On `https://koomn1.github.io/quiz-space/#/dashboard/classrooms`, a valid YouTube lesson for classroom `V77ZT0` initially failed to save even though the authenticated user ID matched the classroom owner ID.
- Root cause: the `classroom_lesson_notification` trigger inserted a notification with `type = 'lesson'`, while `public.notifications` accepted only `info`, `community`, `system`, and `promotion`.
- The issue was fixed live through the migration `notification_lesson_and_platform_settings_access`; retrying the same lesson saved it successfully and the test lesson was then deleted successfully.
- PostgreSQL logs also showed repeated `permission denied for table platform_settings` errors on the public read path. The same migration granted read-only `SELECT` to `anon` and `authenticated`; RLS and the protected update RPC continue to govern writes.
- On `https://koomn1.github.io/quiz-space/#/dashboard/motivation`, claiming the completed weekly task `weekly_complete_three` failed with the visible message `تعذر جمع مكافأة المهمة الأسبوعية الآن`.
- Root cause candidate confirmed in migration source: `claim_weekly_task` inserts a notification with `type = 'weekly_task'`, which is not in the existing `notifications_type_check` constraint. The constraint must include both `lesson` and `weekly_task`.
- On the point-store page, `حزمة نقاط صغيرة` and `صندوق نقاط كبير` were rendered as `0 EGP` while their configured rewards were also zero. The live database now sets them to `25 EGP → 500 points` and `120 EGP → 2,500 points` respectively. The frontend now derives a single explicit payment mode and does not present an unpriced item as purchasable.
