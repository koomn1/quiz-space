# Site-Wide Design, 3D Graphics, Security Hardening & Quality Overhaul Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate every single page in QuizSpace to enterprise and award-winning quality by applying 10 specialized design, graphics, security, and engineering disciplines across all routes.

**Architecture:** A unified design system built on Deep Petrol (`#007472`), Electric Teal (`#2AC3BB`), Sunset Coral (`#EE8361`), Warm Ivory (`#FCF6EE`), and Slate-50 (`#F8FAFC`). Each page operates in its optimal UX mode (Persuade, Operate, Experience, or Read) with zero visual clutter, robust Zero-Trust security, Three.js resource management, smooth transitions, and comprehensive automated verification.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS, Three.js / React Three Fiber, Lucide Icons, Vitest, Playwright, Supabase.

**Spec:** Project architecture defined in `src/app/AppRoutes.tsx`, `src/index.css`, `src/lib/themePresets.ts`, and core page modules.

---

## Global Constraints

- **Brand Palette:** Deep Petrol (`#007472`), Electric Teal (`#2AC3BB`), Sunset Coral (`#EE8361`), Warm Ivory (`#FCF6EE`), Light Canvas (`#F8FAFC`), Dark Canvas (`#031717`).
- **Contrast Ratios:** All text elements must achieve WCAG AAA/AA compliance in both light and dark modes. Saturated primary buttons always use `#FCF6EE` / `#FFFFFF`.
- **Zero-Trust Security:** No hardcoded secrets, no raw SQL/command interpolation, mandatory input sanitization, safe error handling (no swallowed errors).
- **3D Graphics & Memory:** All Three.js renderers, scenes, geometries, and textures must have deterministic disposal routines on component unmount.
- **Motion & Transitions:** All CSS and JS animations must include `@media (prefers-reduced-motion: reduce)` fallbacks.
- **Test Integrity:** 100% test pass rate across all 111 test suites (442+ tests) with zero TypeScript typecheck errors.

---

## Review Focus

1. **Button & Text Legibility:** Verify that every button across light and dark modes has high-contrast text and that `.light-readable-ui` never turns primary button labels dark.
2. **Three.js Disposal:** Ensure `Lanyard.jsx` and any 3D canvas releases WebGL contexts on navigation to prevent memory leaks.
3. **Input Sanitization:** Confirm all form inputs, quiz text fields, and file upload names are safely escaped and validated.
4. **State Machine Completeness:** Every asynchronous action (loading, solving, creating, deleting, saving) must render clear idle, loading, error, and success states.
5. **Mobile Responsiveness:** Ensure full touch affordance (min 44px hit targets) and proper padding across small viewports (iOS safe areas).

---

## Task Breakdown

### Task 1: Design System & Contrast Foundation
**Files:**
- Modify: `src/index.css`
- Modify: `src/lib/themePresets.ts`
- Test: `src/lib/glassSurfaces.contract.test.ts`

- [ ] Step 1: Verify token consistency in `themePresets.ts` (`light.canvas: '#F8FAFC'`, `dark.canvas: '#031717'`).
- [ ] Step 2: Enforce global button contrast rules and container typography in `src/index.css`.
- [ ] Step 3: Run `npx vitest run src/lib/glassSurfaces.contract.test.ts` to verify contract integrity.
- [ ] Step 4: Commit foundation changes.

---

### Task 2: Guest Landing & Authenticated Home
**Files:**
- Modify: `src/pages/GuestLandingPage.tsx`
- Modify: `src/pages/LandingPage.tsx`
- Test: `src/App.guest-landing.contract.test.ts`
- Test: `src/pages/LandingPage.delete-dialog.contract.test.ts`

- [ ] Step 1: Polish Guest Landing Page: refine headline typography, feature column rhythm, and CTA buttons.
- [ ] Step 2: Enhance Authenticated Home: verify Bento metrics, search input focus states, daily challenge card, and quiz action pills.
- [ ] Step 3: Run `npx vitest run src/App.guest-landing.contract.test.ts src/pages/LandingPage.delete-dialog.contract.test.ts`.
- [ ] Step 4: Commit landing page refinements.

---

### Task 3: Quiz Studio & Creator Hardening
**Files:**
- Modify: `src/pages/QuizCreator.tsx`
- Test: `src/pages/QuizCreator.file-guidance.contract.test.ts`
- Test: `src/lib/quizSaveValidation.test.ts`

- [ ] Step 1: Audit Quiz Creator UI: clean container hierarchy, seamless OCR log display, auto-save indicators.
- [ ] Step 2: Verify input validation for questions, options, and explanations with error state shakes.
- [ ] Step 3: Run tests: `npx vitest run src/pages/QuizCreator.file-guidance.contract.test.ts src/lib/quizSaveValidation.test.ts`.
- [ ] Step 4: Commit Quiz Creator improvements.

---

### Task 4: Quiz Solver & Zen Experience
**Files:**
- Modify: `src/components/QuizResolver.tsx`
- Test: `src/components/QuizResolver.cosmo-access.contract.test.ts`
- Test: `src/components/QuizResolver.essay-grading.contract.test.ts`
- Test: `src/components/QuizResolver.score-display.contract.test.ts`

- [ ] Step 1: Refine Quiz Resolver layout: progress bar styling, smooth question transitions, 3D Flashcard flip physics.
- [ ] Step 2: Verify Zen focus mode contrast and essay grading feedback panels.
- [ ] Step 3: Run tests: `npx vitest run src/components/QuizResolver.essay-grading.contract.test.ts src/components/QuizResolver.score-display.contract.test.ts`.
- [ ] Step 4: Commit Quiz Resolver updates.

---

### Task 5: User Profile & 3D Lanyard Engineering
**Files:**
- Modify: `src/pages/UserProfile.tsx`
- Modify: `src/components/Lanyard.jsx`
- Test: `src/pages/UserProfile.profile-save.contract.test.ts`
- Test: `src/pages/UserProfile.hooks.test.ts`

- [ ] Step 1: Ensure Three.js `Lanyard.jsx` properly disposes geometries, textures, and canvas listeners on unmount.
- [ ] Step 2: Audit profile stats Bento, verification badge displays, coin metrics, and edit profile modal.
- [ ] Step 3: Run tests: `npx vitest run src/pages/UserProfile.profile-save.contract.test.ts src/pages/UserProfile.hooks.test.ts`.
- [ ] Step 4: Commit User Profile & Lanyard optimizations.

---

### Task 6: Cosmo AI Assistant Studio
**Files:**
- Modify: `src/pages/AIChat.tsx`
- Test: `src/pages/AIChat.file-quiz.contract.test.ts`
- Test: `worker/src/cosmoChatProviderChain.test.ts`

- [ ] Step 1: Verify Cosmo AI color harmony: sidebar drawer, message bubbles, streaming indicator, and starter cards.
- [ ] Step 2: Ensure error recovery and retry buttons have high-contrast styling and clear recovery paths.
- [ ] Step 3: Run tests: `npx vitest run src/pages/AIChat.file-quiz.contract.test.ts`.
- [ ] Step 4: Commit Cosmo AI improvements.

---

### Task 7: Store, Classrooms, Analytics & Admin Dashboards
**Files:**
- Modify: `src/pages/StorePage.tsx`
- Modify: `src/components/Classrooms.tsx`
- Modify: `src/pages/AnalyticsDashboard.tsx`
- Modify: `src/pages/AdminDashboard.tsx`
- Test: `src/components/AdminPaymentNotificationToast.contract.test.ts`
- Test: `src/lib/adminRewardCatalog.contract.test.ts`

- [ ] Step 1: Polish Store & Rewards: coin balance display, coupon redemption states, product editing modal.
- [ ] Step 2: Polish Classrooms & Analytics: chart color adaptation, member tables, and empty states.
- [ ] Step 3: Audit Admin Dashboard: user tables, role filters, and modal dialogues.
- [ ] Step 4: Run tests: `npx vitest run src/lib/adminRewardCatalog.contract.test.ts src/components/AdminPaymentNotificationToast.contract.test.ts`.
- [ ] Step 5: Commit store and dashboard enhancements.

---

### Task 8: Full Verification, Security Audit & Build
**Files:**
- Repository-wide audit

- [ ] Step 1: Run full TypeScript compilation check: `npx tsc --noEmit`.
- [ ] Step 2: Run complete Vitest suite across all 111 test files (442+ tests): `npx vitest run`.
- [ ] Step 3: Run production build: `npx pnpm build`.
- [ ] Step 4: Commit final verification and push to `origin main`.
