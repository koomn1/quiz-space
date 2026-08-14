# Next-Generation Motivation Product Brief

## Outcome

QuizSpace will reward **consistent, meaningful learning** rather than clicks, purchases, or public comparison. The new system builds on the existing reward ledger so every awarded point, coin, cosmetic choice, and milestone remains attributable and user-visible.

## Experience direction

The primary destination remains the RTL **Motivation Hub**. New features appear as a progressive learning journey rather than an additional dense dashboard: a short learning-focus strip at the top, focused cards for the learner’s next useful action, and deeper detail only after an intentional click. The existing violet, indigo, cyan, amber, and slate visual language remains the source of truth; the externally generated rose palette is treated as an accent reference only, not a replacement for established QuizSpace tokens.

Interactions use lucid icons, text labels, visible keyboard focus, and 44px minimum action targets. Motion is limited to brief card-state transitions and a modest stagger for newly revealed task cards; all nonessential motion must respect `prefers-reduced-motion`.

## Feature decisions

| Feature | First release behavior | Fairness and safety constraint |
|---|---|---|
| Smart review | Shows concise cards from the learner’s lowest-accuracy completed quiz topics and directs them to a targeted review action. | The learner only sees their own data; recommendation inputs are calculated server-side. |
| Classroom challenge | A teacher opens a bounded challenge for a classroom; members see combined progress and their own contribution only. | No public per-student grades or rank ordering; teachers control availability. |
| Flexible streak | A missed day can consume one earned protection day instead of resetting the streak. | The server grants and consumes protection days idempotently; the browser cannot set a streak. |
| Learning season | A time-bounded themed progression offers earned cosmetics and a single reward choice at milestone completion. | All season claims are one-time server transactions and never require payment. |
| Knowledge duel | Two opt-in learners receive comparable question sets from matching difficulty and topic scope. | Rate limits, eligibility checks, no public grades, and no rewards until server-verified completion. |
| Personal improvement | Compares current and prior personal results over matched periods. | No comparison with other learners and no exposure of classroom peers’ performance. |

## Data and execution model

Season and weekly-window state are **evaluated lazily** at read or claim time from timestamps and configured windows. This avoids an unneeded background scheduler. Any state-changing action uses an authenticated, server-authorized RPC, validates the caller and input bounds, writes one idempotent reward event, and emits a user-scoped notification where relevant.

## Release gates

Every capability requires RLS coverage, RPC tests for authorization and duplicate claims, client loading/error states, and TypeScript/build validation. The live review will use an account with ordinary user access and a separate teacher test account for classroom-only actions; it will not use the owner’s balance for reward-claim testing.
