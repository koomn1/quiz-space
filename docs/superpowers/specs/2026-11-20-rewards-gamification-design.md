# QuizSpace Rewards Experience & Mascot Gamification Design

**Date:** 2026-11-20  
**Status:** Approved Architectural Spec  
**Author:** Antigravity AI  
**Target:** QuizSpace Web & Mobile (`src/components`, `src/lib`, `src/types.ts`, `docs`)

---

## 1. Intent & The Why

QuizSpace is an interactive educational and quiz platform with an established luxury brand aesthetic (Petrol, Bright Teal, Ivory, Coral, and Cosmo Dark). While backend tables and services for rewards exist (`db.rewards.ts`, `RewardsSection.tsx`, `types.ts`), the current UI is utilitarian and lacks gamified excitement.

**The Vision:**
Transform the rewards section into a vibrant, high-engagement **Reward & Arcade Center** that feels native to QuizSpace. By introducing an interactive 3D Mascot guide ("كوزمو / Cosmo"), rich procedural 3D elements, custom avatars, and rewarding puzzle mini-games—while **strictly preserving the brand's authentic luxury color palette**—QuizSpace will provide an irresistible loop of learning, quizzing, solving, and earning.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. **Brand-Faithful Luxury Gamification:** Re-architect the reward interface using the official QuizSpace brand tokens: Petrol (`#007472`), Bright Teal (`#2AC3BB`), Coral (`#EE8361`), Sand (`#FBDFC7`), Ivory (`#FCF6EE`), and Cosmo Canvas (`#031717` / `#072424`).
2. **Interactive Mascot & Feature Guide ("Cosmo"):** An engaging 3D character (procedural Three.js canvas) with speech balloons and spotlight navigation that greets the user, introduces newly added features, and walks them through actions ("شوف إيه اللي انضاف جديد! افتح كذا واكسب...").
3. **Pillars Organization:** Cleanly organize the 6 core pillars:
   - Points & Coins balance with animated count-up and transaction ledger.
   - Levels and VIP Tiers with a clear progression rail.
   - Daily and weekly habit loops (Daily Gift Box, Daily Challenges, Weekly Tasks).
   - High-definition Badges and Trophy Showcase with 3D tilt effects.
   - VIP Weekly Leaderboard with interactive podium.
   - Admin Reward Catalog configuration panel.
4. **Mini-Games for Point Collection:**
   - **Cosmic Match (لغز تطابق الذاكرة):** Fast-paced card memory matching game rewarding daily coins.
   - **Word Matrix Puzzle (لغز الكلمات السريع):** Swipe connection puzzle with Arabic letter nodes for bonus XP.
   - **Daily Lucky Spin Wheel (عجلة الحظ اليومية):** Interactive server-authoritative spin wheel with physics for daily mystery rewards.
5. **Avatars & 3D Collectibles:** High-resolution customizable avatar frames and badges redeemable using earned coins (without deducting XP or deranking levels).
6. **Automated Verification:** Full Playwright e2e test suite testing claiming rewards, playing mini-games, and mascot walkthroughs.

### Non-Goals
- Inventing off-brand dark space/sci-fi colors (e.g. generic neon blues, purples) that contradict the existing design system.
- Overloading mobile devices with heavy multi-megabyte 3D GLTF assets; all 3D assets must use lightweight procedural Three.js rendering or optimized vector canvases to ensure instant 60fps load times.
- Real-money gambling or pay-to-win mechanics; coins and points are strictly educational gamification incentives.

### Anti-Goals
- Intrusive popups that cannot be skipped or closed.
- Confusing navigation where users cannot find the primary quiz engine.

---

## 3. Brand & Design Tokens (Strict Enforcement)

| Token | CSS Variable / Value | Purpose |
|---|---|---|
| **Primary (Petrol)** | `--color-petrol` (`#007472`) | Primary buttons, headers, active states |
| **Secondary (Bright Teal)** | `--color-bright-teal` (`#2AC3BB`) | Accents, glow rings, progress bars, active indicators |
| **Accent / Action (Coral)** | `--color-coral` (`#EE8361`) | High-priority CTAs, VIP badges, fire streaks, claim buttons |
| **Light Canvas (Ivory)** | `--color-ivory` (`#FCF6EE`) | Light background, badge highlights, contrast cards |
| **Warm Accent (Sand)** | `--color-sand` (`#FBDFC7`) | Subtle fills, coin shimmer, tier backgrounds |
| **Dark Theme Canvas** | `--color-theme-canvas` (`#031717`) | Night mode background |
| **Dark Theme Surface** | `--color-theme-surface` (`#072424`) | Card backgrounds in dark mode |
| **Dark Theme Card Strong**| `--color-theme-surface-strong` (`#0C3232`)| Modals and elevated surfaces |
| **Border Tone** | `rgba(42, 195, 187, 0.22)` | Glassmorphism borders and separation lines |

Typography strictly uses: `Inter` (UI/Latin), `Cairo` / `Tajawal` (Arabic), `Space Grotesk` (Headings/Numbers), `JetBrains Mono` (Counters/Codes).

---

## 4. Key Architectural Decisions (Builder Check Alignments)

1. **Dual Currency Model:**
   - **XP / Points (`points`):** Lifetime progress metric that governs user level (1 to 100) via `levelingSystem.ts`. **XP is non-spendable** and never deranks the user.
   - **Quiz Coins (`coins`):** Spendable currency earned through quizzes, daily gifts, and puzzle mini-games. Used to purchase avatar frames and store cosmetics in `reward_store_items`.
   - "Quick Exchange" in the UI is a direct shortcut to open the Avatar & Item Store drawer.

2. **Server-Authoritative Mini-Game Authority:**
   - The Daily Lucky Spin Wheel and puzzle reward payouts are validated server-side.
   - For the Spin Wheel: Clicking "Spin" sends an RPC request to the server, which selects the prize according to reward probability weights and returns the winning segment index. The client then animates the deceleration to stop precisely on that segment.
   - Rate limiting: A Supabase table `user_mini_game_claims` enforces maximum daily reward payouts (e.g. 1 spin / day, 3 rewarded puzzle rounds / day).

3. **Database & VIP Tier Compatibility:**
   - The system fully retains QuizSpace's existing 100-level progression (`levelingSystem.ts`) and existing database VIP tiers (`none`, `bronze`, `silver`, `gold`, `platinum`). No risky database migrations on existing tier enum types are required.

4. **Mystery Items & Boosters:**
   - **XP Boost:** Grants a flat instantaneous XP bonus (e.g., +50 XP, +100 XP) logged directly to `reward_ledger`.
   - **Streak Freeze Token:** Increments `streak_freeze_count`, automatically protecting one missed calendar day in `dailyQuizRecovery.ts`.

5. **Arabic Script Word Matrix Mechanics:**
   - The Word Matrix puzzle displays isolated Arabic letters in circular or matrix nodes.
   - Word banks are organized by educational categories in `miniGamesEngine.ts` with daily rotations. Players swipe or tap connected nodes to form target words.

---

## 5. System Architecture & Components

```
src/
├── components/
│   ├── rewards/
│   │   ├── RewardsDashboard.tsx         # Main container replacing/upgrading RewardsSection
│   │   ├── PointsBalanceCard.tsx        # Coins/Points with animated numbers & quick store drawer
│   │   ├── LevelProgressRail.tsx        # 1-100 Level progress & VIP status rail
│   │   ├── DailyGiftMysteryBox.tsx      # 3D interactive chest opening with particles
│   │   ├── DailyChallengesList.tsx      # Interactive progress cards for daily tasks
│   │   ├── WeeklyTasksBoard.tsx         # Weekly milestone rewards
│   │   ├── BadgesTrophyHall.tsx         # 3D tilt badges with rarity filters
│   │   ├── VipLeaderboardPodium.tsx     # 3D styled podium for top 3 + user rank
│   │   ├── RewardLedgerSheet.tsx        # Filterable transaction history drawer
│   │   └── AvatarCustomizerModal.tsx    # Avatar frame unlock & profile selector
│   ├── games/
│   │   ├── ArcadeHubModal.tsx           # Hub for all mini-games
│   │   ├── CosmicMatchGame.tsx          # Memory card match mini-game
│   │   ├── WordMatrixPuzzle.tsx         # Quiz term connection puzzle (Arabic RTL)
│   │   └── DailySpinWheel.tsx           # 3D canvas physics spin wheel (Server-authoritative)
│   ├── mascot/
│   │   ├── CosmoGuideCanvas.tsx         # 3D Three.js lightweight procedural character
│   │   ├── CosmoDialogueBubble.tsx      # Speech bubble with action buttons & sound/chime
│   │   └── CosmoTourSpotlight.tsx       # Spotlight overlay pointing to new features
│   └── AdminRewardCatalogPanel.tsx      # Existing admin panel upgraded with theme styling
├── lib/
│   ├── cosmoTourGuide.ts                # State management for "What's New" & feature spotlights
│   ├── miniGamesEngine.ts               # Logic, word banks, and daily limit tracking
│   ├── avatarCatalog.ts                 # Frames, badges, and unlock criteria
│   ├── rewardPresentation.ts            # (Existing) Augmented with badge rarities and icons
│   └── db.rewards.ts                    # (Existing) Supabase persistence for games & claims
└── types.ts                             # Extended types for mini-games, mascot tours & avatars
```

---

## 6. Verification & Testing Strategy

- **Unit & Contract Tests:**
  - `cosmoTourGuide.test.ts`: Feature detection, dismissal, and persistent seen states.
  - `miniGamesEngine.test.ts`: Scoring algorithms, word matrix matching, and daily limit enforcement.
  - `rewardPresentation.test.ts`: Badge rarity labeling, luxury color consistency, Arabic strings.
- **Playwright End-to-End Tests (`e2e/rewards-experience.spec.ts`):**
  - Verify complete page render with zero visual regressions against QuizSpace brand colors.
  - Verify Cosmo 3D canvas loads and triggers the "What's New" tour.
  - Test opening the Daily Gift Chest and confirming coin balance increase.
  - Test completing a Cosmic Match mini-game session and verifying coin ledger entry creation.
  - Test VIP leaderboard ranking display and modal responsiveness on both Desktop (1920x1080) and Mobile (390x844).
