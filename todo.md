# Project TODO: QuizSpace Enhancement & Production Hardening

- [x] Phase 1: Define development scope and inspect QuizSpace repository
- [x] Phase 2: Review user identity, UX touchpoints, and core learning flows
- [x] Phase 3: Audit backend, authentication, database RLS, and role permissions
- [x] Phase 4: Upgrade UI polish, store economics, and interactive components
- [x] Phase 5: Test all buttons, settings, rewards, and responsive breakpoints
- [x] Phase 6: Save checkpoint and deliver fully enhanced QuizSpace platform
- [ ] Run a full button-and-route test inventory for rewards, store, profile, classrooms, admin, quiz creator, settings, and authentication
- [ ] Repair reward-store purchases, wheel spins, item delivery, and duplicate action protection
- [ ] Repair profile cover and frame persistence, owned-item selection, and large balance display
- [ ] Repair classroom lesson creation, permissions, Ghost Mode messages, and administrative controls
- [ ] Repair quiz creation/extraction feedback, settings persistence, and email-confirmation flows
- [ ] Improve mobile responsiveness, navigation resilience, code-splitting, and deferred heavy-library loading
- [x] Run production build, type checks, live browser smoke tests, and publish only verified fixes
- [x] Deliver a transparent repair report with verified behavior and remaining external-integration requirements
- [x] Replace client-side frame activation with server-verified ownership checks and block unsafe direct frame updates
- [x] Persist notification preferences in user-scoped database records and apply changes without a page refresh
- [x] Guard classroom lesson creation against guest writes and duplicate submissions with actionable errors
- [x] Improve document-extraction fallback progress, validate empty generated questions, and surface a clear final failure message
- [x] Add production chunk splitting for React, motion, icons, charts, PDF, and Supabase dependencies
- [x] Eliminate header crowding from large balances on narrow screens and raise core navigation/catalog controls to 44px touch targets
- [x] Add automated tests for rewards, store ownership, classroom lesson permissions, notification preferences, and file-extraction failures
- [x] Add an authenticated user-facing reward ledger showing each points and coins change with its source and timestamp
- [x] Add secure weekly learning tasks with server-validated progress, one-time rewards, and visible completion state
- [x] Extend the unified notification centre for rewards, weekly tasks, classroom lessons, and administrative updates
- [x] Add client performance telemetry and improve deferred loading for noncritical features
- [ ] Audit the authenticated mobile experience across profile, rewards, store, classrooms, motivation hub, and settings
- [ ] Run authenticated regression tests with a designated test account and publish the verified release
- [x] Restore the Google OAuth option in the authentication modal and verify its configured redirect flow
- [x] Surface the reward ledger and weekly tasks from the authenticated Motivation Hub, not only the legacy profile statistics view
- [x] Verify authenticated Google sign-in, Motivation Hub tasks and ledger, and notification filters without changing balances or purchase history
- [x] Add smart review cards driven by the learner's real weak areas and recent quiz activity
- [x] Add collaborative classroom challenges with privacy-preserving member contribution and progress
- [x] Add a flexible learning streak with a limited protection-day mechanic
- [x] Add a seasonal learning track with earned cosmetic rewards and a fair optional reward choice
- [x] Add an opt-in knowledge duel with rate limits, equalized question selection, and no public grade exposure
- [x] Add a personal improvement dashboard that compares the learner with their own prior performance
- [ ] Integrate the new motivation features with the rewards ledger, notification centre, permissions, tests, and responsive UI checks
- [x] Prevent blank unauthenticated deep links to Motivation Hub sections and direct guests to the sign-in flow
- [x] Verify live motivational feature flows and replace visible decorative emoji with lightweight polished visual elements
- [x] Enhance the Motivation Hub visual hierarchy, progress feedback, and card interactions with lightweight responsive polish
- [x] Audit, track, and report privacy-preserving usage metrics for the new Motivation Hub tabs
- [ ] Inventory and safely test every interactive QuizSpace control, excluding logout and deferring destructive or financial actions for explicit approval
- [ ] Complete user-authorized internal state-change checks while avoiding irreversible external payment, publication, or deletion completion steps
- [x] Diagnose and repair the reproducible classroom lesson-save failure for valid YouTube lesson data, then cover it with regression testing
- [x] Diagnose and repair the weekly-task reward claim failure for completed tasks, enforce a single user-scoped claim, then verify the balance, ledger, and notification update
- [x] Isolate learning-streak state per authenticated user, enforce it in database reads and writes, and verify it cannot be shared across accounts
- [x] Unify the daily-gift streak display with the canonical per-user learning-streak source and verify it matches the momentum card
- [x] Repair daily quiz-point accounting so the canonical balance, header, profile, ledger, and relevant reward views update consistently after completion
- [x] Prevent a daily-quiz result from exiting or clearing its recovery state unless completion and reward persistence succeed
- [x] Repair daily-quiz slot recovery when a user has no private payload, so the fixed question bank is generated instead of leaving the card in a perpetual preparing state
- [x] Enforce a user-scoped one-attempt policy for each daily brain-challenge question and show the saved result or clear completed state after reload
- [x] Repair all visible zero-priced point-store offers and point packages so every purchasable item has a positive configured price
- [x] Diagnose the GitHub Pages asset mismatch: a stale cached index referenced a retired hashed bundle, while a fresh index request loaded the deployed storefront code and corrected prices
- [x] Prevent non-Arabic language leakage in Arabic AI-generated questions and explanations, then verify a short live generation
- [x] Remove ambiguous zero-valued monthly-pass display from point-store bundles while retaining their positive point purchase cost
- [x] Ensure completed onboarding is persisted per account across browser sessions and does not reappear after a new device login
- [x] Diagnose and repair activation of an owned profile frame from the point store, then verify the saved active frame after refresh
- [x] Prevent a completed daily lucky-spin attempt from replaying the wheel animation, and show localized completed-state feedback
- [x] Benchmark daily-quiz reward RPC latency and controlled concurrency, then verify reward-ledger idempotency and database responsiveness under load
- [x] Run a guarded, read-only site load test with stepped concurrency and automatic error/latency stop conditions, then document the measured capacity range
- [x] Perform an authorized non-destructive security assessment of data isolation, reward authorization, and tamper resistance without changing live user data
- [x] Design a secure asynchronous file-extraction and quiz-generation workflow with progress status, structured results, and a measured latency improvement target
- [x] Enable and verify the n8n integration with the minimum credentials and a safe health check — superseded by the selected internal architecture; no live n8n integration was connected
- [x] Guide the user through connecting or creating an n8n account without exposing API keys in chat — superseded by the selected internal architecture
- [x] Verify secure access to the provided n8n Cloud workspace before creating the extraction workflow — superseded after the authorization constraint; no live Quiz Space data was exposed
- [x] Confirm the authenticated n8n session can list and create an isolated test workflow — superseded by the selected internal architecture
- [x] Keep the n8n setup user-facing flow limited to a single explicit approval step with no API keys exchanged in chat — superseded by the selected internal architecture
- [x] Close the temporary public webhook created during setup before connecting any live Quiz Space data
- [x] Create an isolated n8n webhook workflow that validates a test extraction job without accessing live user files — superseded by the selected internal architecture
- [x] Define signed job/callback contracts and job lifecycle persistence for asynchronous file extraction — implemented through user-scoped Supabase jobs and private Storage paths
- [x] Build and test the n8n extraction workflow with authenticated callbacks and structured quiz results — superseded by the selected internal architecture
- [x] Add a user-scoped internal extraction-job model with status, progress, idempotency, and safe error data
- [x] Add protected worker endpoints to create, process, and fetch internal extraction jobs without exposing provider keys
- [x] Update Quiz Creator to submit and resume internal extraction jobs with live progress and saved structured quiz results
- [x] Verify the published end-to-end internal extraction job, including durable queue delivery and resumption without re-uploading the same file
- [x] Replace short-lived background execution with a durable Cloudflare Queue consumer and verify delivery from the published worker
- [x] Add a strict local fast path for fully structured literal-question files before any external model fallback
- [x] Generate questions from narrative text files through a text model instead of إرسالها كصورة إلى نموذج الرؤية
- [x] Run and document a large-PDF extraction load test through Cloudflare Queue, including queue delay, processing time, progress persistence, and result integrity
- [x] Avoid full sequential text scanning for large scanned PDFs and keep their processing lease valid through vision chunk preparation
- [x] Re-architect scanned-PDF vision extraction as persisted per-chunk queue work so each completed chunk saves progress and retries independently
- [x] Define measurable extraction latency budgets and record end-to-end timings for text, generated-text, text-PDF, and scanned-PDF routes
- [x] Implement persisted per-chunk queue processing for scanned PDFs, including safe aggregation, idempotent retries, and parent-job finalization
- [x] Show truthful per-chunk progress and a non-binding time estimate in Quiz Creator without blocking upload or resume behavior
- [x] Run production-safe regression and load tests across text, generated-text, native-text PDF, and scanned-PDF extraction paths, then document measured results
- [x] Create a nine-page PDF with a deterministic question inventory and verify live extraction count and question-content fidelity without publishing the draft
- [x] Repair automatic file-extraction request validation so the UI's automatic question-count option produces a valid authenticated Worker job
- [x] Route short scanned PDFs with no extractable text sample into the persisted vision-chunk pipeline instead of failing on the text-only path
- [x] Run a production-safe 50-page scanned-PDF load test with queue-admission, per-chunk, latency, result-fidelity, and resource-proxy measurements

- [x] Implement dynamic PDF chunk sizing and chunk-level fallback/retry for large scanned files
- [x] Remove the legacy first 12 avatar presets and replace them with a curated cartoon avatar catalog
- [x] Add new QuizSpace avatar assets for football, studying, music, walking, cap, glasses, and varied activities
- [x] Replace duplicate frame image assignments with unique frame assets and enforce catalog de-duplication
- [x] Update profile frame rendering to use a centered circular overlay with correct fit and no duplicate items
- [x] Update default avatar selection so new users never receive removed legacy avatar IDs
- [x] Add mobile-first avatar/frame picker accessibility, loading states, and 44px touch targets
- [x] Add Vitest coverage for avatar catalog uniqueness, frame catalog uniqueness, and dynamic chunk sizing
- [x] Run production build, type checks, and mobile screenshots; authenticated profile/store smoke check deferred because the published browser session was visitor-only
- [x] Save a verified local checkpoint with the complete QuizSpace improvement set

## Phase-by-phase implementation sequence (requested 2026-08-15)
- [ ] 1. Test profile & store state in an authenticated mock/session flow
- [x] 2. Compress and link the remaining profile assets; optimized WebP links are live for completed assets and reserved URLs are linked for the background-generated set
- [x] 3. Harden large PDF extraction with dynamic fallback and chunk-level retry backoff (exponential backoff up to 60s)
- [x] 4. Enhance mobile UX for avatar and frame pickers (filters, touch targets, loading states)
- [x] 5. Add backend asset governance and automated uniqueness validation for catalog items
- [x] 6. Run automated regression tests, performance checks, and idempotency benchmarks (77 tests passed)
- [x] 7. Perform final verification and save a clean local checkpoint

## Second independent audit (requested 2026-08-15)
- [x] Verify working tree, commits, and migration ordering against the actual repository state; corrected a duplicate, destructive migration and timestamp collision
- [x] Re-run type checks, production build, full Vitest suite, and Worker TypeScript checks (83 tests passed)
- [x] Inspect PDF retry/backoff behavior and extend tests for the queue delay calculation
- [x] Verify profile asset URLs, generated-image status, and frame catalog uniqueness in Supabase; corrected broken GitHub Pages paths
- [x] Run local asset and mobile-shell smoke checks; browser navigation did not reach an authenticated profile route, documented as an environment limitation
- [x] Record findings, correct confirmed issues, and save a clean verification checkpoint

## User Feedback Fixes (2026-08-15 - Broken images and refresh state loss)
- [x] 1. Debug why profile asset images fail to load and show broken image icons on mobile
- [x] 2. Fix profile selection persistence so avatar and frame choices do not revert after page refresh
- [x] 3. Regenerate and clean profile frames to ensure true transparent background and correct circular fit
- [x] 4. Run full production verification and build with clean local assets

- [x] 127. Synchronize all curated avatar/frame catalog and reward-store rows with audited deterministic transparent WebP assets
- [x] 128. Remove refresh-time legacy avatar fallback paths and cover them with regression tests
- [x] 129. Run authenticated profile avatar/frame select-save-refresh smoke test and document any session limitation

- [x] 130. Diagnose and fix the published profile-route recovery boundary after deterministic asset deployment

- [ ] 131. Roll back only the latest avatar/frame visual rollout while preserving PDF extraction, persistence, and React stability fixes
- [ ] 132. Remove duplicate-looking avatar entries and the broken/white-square frame assets from the production catalog
- [ ] 133. Generate a distinct multi-pose cartoon avatar set and new transparent circular frame set
- [ ] 134. Audit alpha transparency, circular fit, uniqueness, and loadable URLs for every replacement asset
- [ ] 135. Update profile asset mappings, fallbacks, tests, and production verification for the replacement set

- [x] 136. Remap direct clean-assets-deterministic avatar URLs already stored on profiles to the new replacement avatar set

- [x] 137. Add Playwright E2E coverage for authenticated profile avatar and frame rendering, image load failures, alpha-safe replacement URLs, and refresh persistence
- [x] 138. Add responsive Playwright coverage for avatar/frame picker touch targets and desktop/mobile layout
- [x] 139. Run Playwright locally and in CI with a safe authenticated-session strategy, then document any environment limitation

- [x] 140. Add versioned long-lived caching for replacement avatars and frames without serving stale assets after future redesigns
- [x] 141. Add safe avatar/frame preload and cache-reuse assertions without blocking first paint
- [x] 142. Run regression, Playwright network-cache checks, and production verification for avatar/frame caching

- [x] 143. Measure current exported quiz PDF size and generation time across text-only and image-heavy quizzes
- [x] 144. Optimize quiz PDF export size and verify readable output, page count, and generation speed
- [x] 145. Define Free, Plus, Pro, and School subscription plans with explicit features, quotas, and upgrade messaging
- [x] 146. Enforce subscription entitlements in frontend and backend paths without trusting client-only plan Werte/values
- [x] 147. Add tests for PDF export optimization and subscription entitlement enforcement, then verify production behavior

- [x] 148. Add institution, institution member, and auditable seat-allocation tables with secure RLS and seat-limit enforcement
- [x] 149. Add SECURITY DEFINER RPCs for Diamond activation, institution creation, invitation, seat assignment, revocation, and manager-only access checks
- [x] 150. Build a responsive Arabic Institution Workspace for owners to manage identity, teachers, seats, and institution status
- [x] 151. Add an admin activation flow that converts an approved Diamond request into an active institution owner workspace
- [x] 152. Add unit and integration coverage for institution authorization, seat limits, and member lifecycle; verify published workflow

- [x] 153. Diagnose the 32.82MB PDF export issue caused by image-based rendering of text-only quizzes
- [x] 154. Implement true vector/text PDF export for text-only quizzes to reduce file size below 5MB
- [x] 155. Optimize image compression and resolution for quizzes that actually contain images
- [x] 156. Verify PDF export size, text readability, and mobile download compatibility

- [x] 157. Add a user-scoped export-history record and private PDF storage flow with strict ownership checks
- [x] 158. Record successful PDF exports and preserve the generated vector PDF for later download
- [x] 159. Add an authenticated Export History section to the user dashboard with responsive download actions
- [x] 160. Add regression coverage for export-history ownership, persistence, redownload behavior, and mobile layout

- [x] 161. Audit the existing Quiz Space authentication modal and preserve all current auth flows
- [x] 162. Redesign the Quiz Space login/register experience with a cleaner Arabic RTL visual system and responsive states
- [x] 163. Verify login, Google OAuth wiring, registration, MFA, theme contrast, focus states, and mobile layout (password reset is not exposed by the existing auth contract)

- [x] 164. Add a secure Supabase password-recovery request method and reuse QuizSpace auth redirect normalization
- [x] 165. Detect recovery sessions and support a dedicated password-update state without weakening existing OAuth/MFA flows
- [x] 166. Add coordinated forgot-password and reset-password screens inside the real QuizSpace AuthModal
- [x] 167. Test recovery request states, redirect contract, validation, accessibility, responsive layout, and auth regression coverage (live email submission and token exchange were not executed in the local placeholder environment)

- [x] 168. Fix the email/password login success contract so App never reads id from a null user payload
- [x] 169. Reconcile email login, Google OAuth, MFA, and recovery success handling without regressing existing auth flows
- [x] 170. Improve AuthModal light/dark contrast and visual clarity using the supplied login-signup reference without reducing readability
- [x] 171. Regression-test email login error handling, auth success paths, theme contrast, and responsive login UI

- [x] 172. Create a standalone guest-only marketing landing page using the official QuizSpace logo and real in-product screenshots
- [x] 173. Capture and optimize authentic home, quiz-creation, challenges, and rewards visuals for the guest landing page
- [x] 174. Route authenticated users straight to the current member home and show account controls when they revisit the informational landing page
- [x] 175. Verify guest/member routing, responsive landing visuals, contact actions, and the production build
- [x] 176. Implement dynamic trial duration parsing (7, 14, 30 days) on super-admin approval and calculate exact renewal/expiry timestamps
- [x] 177. Persist trial start and expiration dates in user subscription records and enforce automatic expiration checks
- [x] 178. Verify dynamic trial approval, duration persistence, and test coverage
- [x] 179. Add visual trial progress bar component in the user dashboard showing remaining days, percentage elapsed, and expiry countdown
- [x] 180. Verify trial progress bar rendering, responsive design, and production build
- [x] 181. Make trial progress bar color dynamically shift to red when remaining days are less than 3 days
- [x] 182. Verify red alert threshold styling, responsiveness, and final production build
- [x] 183. Implement in-app alert banner & notification system for trials expiring in 3 days or less without spamming
- [x] 184. Verify trial expiration alert notification, action link to billing, and production build
- [x] 185. Add Super Admin Trial Analytics section showing active trial counts and members approaching expiration (<= 3 days)
- [x] 186. Verify Super Admin trial stats rendering, real-time metrics, responsive design, and production build
- [x] 187. Raise the quiz generation question-count options and enforce the new cap safely across generator inputs.
- [x] 188. Diagnose and fix the AI Monitoring tab/page failure with guarded data loading and mobile-safe rendering.
- [x] 189. Diagnose and fix the Admin Subscriptions coupons tab failure, including React hook correctness and safe coupon state handling.
- [x] 190. Add regression coverage and verify direct navigation, Android-sized rendering, type-check, and production build for the repaired paths.
- [x] 191. Move trial-offer activation from browser localStorage to a centrally managed Supabase configuration with super-admin-only writes.
- [x] 192. Add secure database migration, RLS/RPC contracts, client synchronization, and regression coverage for 7/14/30-day offers.
- [x] 193. Diagnose and repair Diamond subscription entitlement so eligible members can open and activate their Institution Workspace.
- [x] 194. Diagnose and repair the Cosmo quiz-generation failure shown on Android, including worker request, entitlement, and actionable error handling.
- [x] 195. Restore trustworthy AI Monitoring data flow and Super Admin rendering from live generation logs.
- [x] 196. Add regression coverage and verify Diamond institutions, Cosmo generation, AI monitoring, mobile layout, and production deployment.
- [x] 197. Diagnose and repair the AI worker telemetry insert path so authenticated Cosmo requests persist success and error records in Supabase.
- [x] 198. Add telemetry write-response validation and verify a real authenticated generation appears in Super Admin AI Monitoring.
