# Comprehensive Profile, Leaderboard, Level 100 Scaling & Title Avatars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform QuizSpace's player progression into a world-class educational gamification system: cap levels at 100 with a balanced XP curve, create creative unlocks for levels 1-100 with an interactive Roadmap modal, generate dedicated glowing avatars/badges for user titles, fix the accuracy percentage bug, make public user profiles fully visible to all visitors with handle lookup, and upgrade the Leaderboard with real rankings, accuracy, level badges, and direct profile navigation.

**Architecture:**
1. Dedicated progression engine (`src/lib/levelingSystem.ts`) computing levels (1..100), XP thresholds, titles, divisions, title avatars, and concrete unlockable perks for every single level.
2. Database and profile resolver fixes in `src/lib/db.ts` to map completions through `mapCompletionRow`, calculate real accuracy, support handle lookup (`custom_id` / `@username`), and surface complete profile data (XP, Level, location, cover, bio, frames) to visitors.
3. Interactive UI additions in `src/pages/UserProfile.tsx`: Title Avatar Badge, Level Progress bar with Max 100 cap, dynamic Accuracy gauge card with sniper rating, and Level Unlocks Roadmap Modal (`LevelRoadmapModal.tsx`).
4. Re-engineered Leaderboard in `src/components/ExtraFeatures.tsx`: filter by XP, accuracy, or solved quizzes, displaying rank podium, level badges, title avatars, and one-click profile links.

**Tech Stack:** TypeScript, React 19, Tailwind CSS v4, Lucide Icons, GSAP, Supabase, Vitest/Node verification scripts.

**Spec:** User brief dated 2026-11-19:
- Fix and upgrade Leaderboard ("لوحة الصداره").
- Fix accuracy percentage and display stats in user profile ("نسبة الدقه اللي ف الملف الشخصي").
- Ensure user profile information is completely visible to any visitor ("خلي معلومات الملف الشخصي تظهر لاي شخص").
- Calibrate Level & XP per level, capping Level strictly at Max 100 ("ظبط الليفل و ظبط نقاط xp لكل مستوى وخلي الليفل ماكس من ١٠٠").
- Provide unique unlocks for levels from 1 to 100 ("و كل مستوى بيفتح حاجه جديده فكر انت في حاجات جديده و اعملها لكل مستوى").
- Design distinct avatars/badges for ranks and titles ("اعمل افاتارات للالقاب لانها مش ظاهره").

## Global Constraints
- Maximum Level is strictly 100 (`level = Math.min(100, Math.max(1, calculatedLevel))`).
- Accuracy percentage must never default to 0% when completed quizzes have questions (`totalQuestions > 0`).
- Public profile view must never crash or hide user stats when accessed by an anonymous visitor or via custom handle (`@username`).
- Brand Color Triad compliance: Petrol (`#007472`) + Bright Teal (`#2AC3BB`) + Coral/Orange (`#EE8361`).
- Verification before completion: all contract tests and unit tests must run fresh and pass.

## Review Focus
1. `c.totalQuestions` undefined regression due to raw snake_case rows: verify normalization catches both `totalQuestions` and `total_questions`.
2. Public profile RPC column restrictions: verify `getUserProfileStats` falls back gracefully to public-safe direct query or enriched mapping so location, XP, and frames are never wiped out for visitors.
3. Level 100 cap enforcement: verify players with over 1,000,000 XP cap at Level 100 and display 100% progress.
4. Custom handle resolution: verify visiting `#/profile/youssef_badawy` resolves accurately when `custom_id` matches.
5. Leaderboard profile navigation: verify clicking any podium winner or list item opens their public profile.

---

### Task 1: Leveling Engine & 1-100 Progression System (`src/lib/levelingSystem.ts`)

**Files:**
- Create: `src/lib/levelingSystem.ts`
- Test: `test_leveling_system.mjs`

- [ ] Define the mathematical XP progression function from Level 1 to 100:
  - Level 1: 0 XP
  - Level 10: 2,500 XP
  - Level 50: 160,000 XP
  - Level 100: 1,000,000 XP (Max Level cap)
- [ ] Define 10 Grand Divisions with custom titles and title avatars:
  - Div 1 (Lv 1-10): مستكشف جديد (Novice Explorer) - Compass/Sparkle Avatar
  - Div 2 (Lv 11-20): باحث نشط (Active Scholar) - Book/Scroll Avatar
  - Div 3 (Lv 21-30): بطل التحديات (Quiz Challenger) - Bronze Shield/Sword Avatar
  - Div 4 (Lv 31-40): عالم الفضاء (Cosmic Scholar) - Silver Astrolabe Avatar
  - Div 5 (Lv 41-50): فيلسوف الاختبارات (Quiz Philosopher) - Golden Quill/Wreath Avatar
  - Div 6 (Lv 51-60): سيد الأكاديمية (Academy Master) - Ruby Crest Avatar
  - Div 7 (Lv 61-70): القائد الأسطوري (Legendary Commander) - Sapphire Helm Avatar
  - Div 8 (Lv 71-80): حارس الحكمة (Guardian of Wisdom) - Emerald Crown Avatar
  - Div 9 (Lv 81-90): حاكم المجرة (Galactic Overlord) - Obsidian Nebula Avatar
  - Div 10 (Lv 91-100): أسطورة الفضاء الأعظم (Grandmaster of the Universe) - Diamond Celestial Star Avatar
- [ ] Implement creative unlocks dictionary for every level from 1 to 100 (frames, theme palettes, audio chimes, bio flair, profile glow, badges, certificate seals).
- [ ] Implement `calculateUserLevel(xp: number)`, `getLevelProgress(xp: number)`, and `getLevelReward(level: number)`.
- [ ] Write unit test `test_leveling_system.mjs` and execute with Node.js.

### Task 2: Fix Accuracy Percentage & Public Profile Resolution in Database Layer (`src/lib/db.ts`)

**Files:**
- Modify: `src/lib/db.ts:1158-1260`
- Test: `test_profile_accuracy_db.mjs`

- [ ] In `getUserProfileStats(userId: string)`:
  - Support lookup by `uid` or `custom_id` (`lower(custom_id) = lower(userId)`).
  - Map all completion rows through `mapCompletionRow` for both own profile and public profile so `c.totalQuestions` is always available.
  - Calculate `accuracy` reliably from completions with positive total questions.
  - Return `xp`, `level`, `accuracy`, `location`, `coverUrl`, `activeFrameId`, and `activeQuizFrameId` for public profiles.
- [ ] Add `getTopLeaderboardUsers(limit: number, criteria: 'xp' | 'accuracy' | 'solved')` in `src/lib/db.ts`.
- [ ] Write contract & regression test `test_profile_accuracy_db.mjs` and verify.

### Task 3: Profile UI: Level 100 Badge, Title Avatar, Accuracy Gauge & Level Roadmap Modal (`src/pages/UserProfile.tsx` & `src/components/LevelRoadmapModal.tsx`)

**Files:**
- Create: `src/components/LevelRoadmapModal.tsx`
- Modify: `src/pages/UserProfile.tsx`
- Test: `test_profile_ui_contracts.mjs`

- [ ] In `UserProfile.tsx`:
  - Replace the ad-hoc `xp / 500 + 1` with `calculateUserLevel(xp)` capped at 100.
  - Display the new dedicated Title Avatar & Badge next to user identity.
  - Display the enhanced Accuracy Card with sniper rating badge ("دقة أسطورية 🎯").
  - Add an interactive button to open the "خريطة المستويات والمكافآت (Level Unlocks Roadmap)".
- [ ] Create `src/components/LevelRoadmapModal.tsx`:
  - Show the user's progress toward Level 100 with interactive progress bar.
  - Scrollable visual track showing all 100 levels with their status (مكتمل / الحالي / مقفل) and exact unlockable perk.
- [ ] Ensure non-owners (visitors) see all stats, quizzes, accuracy, level, and bio cleanly, while editing and subscription actions remain owner-only.

### Task 4: Re-engineered Leaderboard (`src/components/ExtraFeatures.tsx`)

**Files:**
- Modify: `src/components/ExtraFeatures.tsx:2168-2350`
- Test: `test_leaderboard_section.mjs`

- [ ] Add tab filters to Leaderboard:
  - "أساطير الخبرة (XP Leaders)"
  - "قناصو الدقة (Accuracy Masters)"
  - "الأكثر إنجازاً (Top Solvers)"
- [ ] Display Level badge (Lv.1 - 100), Title Avatar, Accuracy percentage, and solved count for every user on the podium and table.
- [ ] Make all users clickable to navigate directly to their public profile `#/profile/${user.userId}`.

### Task 5: End-to-End Verification, Verification Gate & Git Push

**Files:**
- All touched files
- Verification script: `test_all_features_suite.mjs`

- [ ] Run full test suite covering leveling calculations, Level 100 cap, accuracy calculations, public profile resolution, and leaderboard data structures.
- [ ] Ensure all existing contract tests pass (`profileCoverPersistence.contract.test.ts`, `UserProfile.profile-save.contract.test.ts`).
- [ ] Commit with clean git history and push to `origin/main`.
