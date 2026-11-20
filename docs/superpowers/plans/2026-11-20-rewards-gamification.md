# QuizSpace Rewards Experience & 3D Mascot Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the QuizSpace rewards interface into an engaging, luxury-gamified Reward & Arcade Center featuring an interactive 3D Mascot guide ("Cosmo"), Arabic puzzle mini-games, and organized 6-pillar reward dashboard, strictly honoring the brand's palette (Petrol, Bright Teal, Coral, Ivory, Sand).

**Architecture:** A modular React frontend built on top of the existing `db.rewards.ts` and `types.ts` models. It integrates a lightweight procedural Three.js mascot canvas (`CosmoGuideCanvas`), an arcade game engine (`miniGamesEngine.ts`) with Arabic word and memory puzzles, and an upgraded `RewardsDashboard` organizing the 6 reward pillars with React-bits motion and glassmorphic surfaces.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Three.js (procedural canvas), Vitest, Playwright.

**Spec:** [`docs/superpowers/specs/2026-11-20-rewards-gamification-design.md`](file:///c:/Users/RDP/.gemini/antigravity/scratch/quiz-space/docs/superpowers/specs/2026-11-20-rewards-gamification-design.md)

---

## Global Constraints

- **Strict Brand Palette:** Strictly use `--color-petrol` (`#007472`), `--color-bright-teal` (`#2AC3BB`), `--color-coral` (`#EE8361`), `--color-ivory` (`#FCF6EE`), `--color-sand` (`#FBDFC7`), and `--color-theme-surface` (`#072424`). No generic space blues/purples.
- **Dual Currency Integrity:** XP (`points`) is cumulative and non-spendable; spending coins in the avatar shop must NEVER deduct XP or decrease user level.
- **Performance & Asset Weight:** 3D graphics must use lightweight procedural Three.js geometry without multi-megabyte GLTF models, ensuring 60fps on mobile.
- **RTL & Arabic First:** All dialogues, tour guides, word puzzles, and badge names must have natural Arabic phrasing and RTL support.

---

## Review Focus

1. **Tour Guide Dismissal:** User clicks dismiss on Cosmo's "What's New" bubble; verify state is persisted in localStorage and does not annoyingly re-pop on every route navigation.
2. **Double-Claim Prevention:** Rapid clicking on the Daily Gift Chest or Spin Wheel must be debounced and protected against duplicate claims.
3. **Arabic Word Puzzle Touch Gesture:** Touch and drag across Arabic letter nodes in RTL mode must accurately detect connected letters regardless of screen DPI.
4. **Mobile Responsive Viewport:** Ensure the 6-pillar dashboard and 3D canvas do not cause horizontal scrolling or overflow on 390px mobile screens.
5. **Brand Color Fidelity:** Ensure all buttons, borders, and modal cards strictly inherit from the theme tokens rather than hardcoded generic tailwind colors.

---

### Task 1: Reward Presentation & Gamification Types

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/rewardPresentation.ts`
- Test: `src/lib/rewardPresentation.test.ts`

**Interfaces:**
- Produces: `CosmoTourState`, `MiniGameId`, `MiniGameSession`, `MiniGameResult`, `AvatarFrameItem`, `WordMatrixPuzzleData`
- Extends: `RewardsSummary`, `RewardBadge` with rarity indicators

- [ ] **Step 1: Write failing tests for reward presentation updates**

```typescript
// src/lib/rewardPresentation.test.ts
import { describe, expect, it } from 'vitest';
import { getBadgeRarityStyle, getRewardEventLabel } from './rewardPresentation';

describe('rewardPresentation luxury tokens', () => {
  it('returns brand color styles for badge rarities', () => {
    const legendary = getBadgeRarityStyle('legendary');
    expect(legendary.borderColor).toBe('var(--color-coral, #EE8361)');
    expect(legendary.glowColor).toContain('42, 195, 187');
  });

  it('maps mini-game reward event labels correctly in Arabic', () => {
    const label = getRewardEventLabel('mini_game_cosmic_match', 'ar');
    expect(label).toContain('لعبة تطابق الذاكرة');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rewardPresentation.test.ts`  
Expected: FAIL with missing functions / properties.

- [ ] **Step 3: Implement types and presentation helpers in `src/types.ts` & `src/lib/rewardPresentation.ts`**

Add `CosmoTourState`, `MiniGameId`, `AvatarFrameItem`, `getBadgeRarityStyle` honoring Petrol/Teal/Coral tokens.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rewardPresentation.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/lib/rewardPresentation.ts src/lib/rewardPresentation.test.ts
git commit -m "feat(rewards): extend gamification types and luxury presentation helpers"
```

---

### Task 2: Cosmo 3D Mascot & "What's New" Guide System

**Files:**
- Create: `src/lib/cosmoTourGuide.ts`
- Create: `src/components/mascot/CosmoGuideCanvas.tsx`
- Create: `src/components/mascot/CosmoDialogueBubble.tsx`
- Create: `src/components/mascot/CosmoTourSpotlight.tsx`
- Test: `src/lib/cosmoTourGuide.test.ts`

**Interfaces:**
- Produces: `useCosmoTour()`, `CosmoGuideCanvas`, `CosmoDialogueBubble`, `CosmoTourSpotlight`
- Consumes: `CosmoTourState` from `src/types.ts`

- [ ] **Step 1: Write failing tests for `cosmoTourGuide.ts`**

```typescript
// src/lib/cosmoTourGuide.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { getTourState, dismissTourStep, markFeatureSeen, shouldShowTour } from './cosmoTourGuide';

describe('cosmoTourGuide', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows tour for newly added features when unvisited', () => {
    expect(shouldShowTour('rewards_arcade_v1')).toBe(true);
  });

  it('persists dismissed tour step in localStorage', () => {
    dismissTourStep('rewards_arcade_v1');
    expect(shouldShowTour('rewards_arcade_v1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cosmoTourGuide.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `cosmoTourGuide.ts` and Mascot Components**

1. `cosmoTourGuide.ts`: localStorage-backed state for tour steps and spotlight targeting.
2. `CosmoGuideCanvas.tsx`: Three.js procedural sphere helmet, teal visor with soft glow, floating hands, idle hovering oscillation, celebrate spin.
3. `CosmoDialogueBubble.tsx`: Floating chat bubble with text in Arabic ("شوف إيه اللي انضاف جديد!..."), "خدني هناك" button, and dismiss icon.
4. `CosmoTourSpotlight.tsx`: Smooth spotlight overlay highlighting targeted UI element.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cosmoTourGuide.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cosmoTourGuide.ts src/lib/cosmoTourGuide.test.ts src/components/mascot/
git commit -m "feat(mascot): implement Cosmo 3D procedural guide and spotlight tour"
```

---

### Task 3: Arcade Mini-Games Engine & Word Matrix Puzzle

**Files:**
- Create: `src/lib/miniGamesEngine.ts`
- Create: `src/components/games/WordMatrixPuzzle.tsx`
- Test: `src/lib/miniGamesEngine.test.ts`

**Interfaces:**
- Produces: `getDailyWordMatrix()`, `verifyWordSolution()`, `getDailyGameAllowance()`, `recordGamePlay()`
- Consumes: `MiniGameSession`, `WordMatrixPuzzleData`

- [ ] **Step 1: Write failing tests for mini-game engine**

```typescript
// src/lib/miniGamesEngine.test.ts
import { describe, expect, it } from 'vitest';
import { getDailyWordMatrix, verifyWordSolution, calculatePuzzleReward } from './miniGamesEngine';

describe('miniGamesEngine', () => {
  it('generates consistent daily Arabic word puzzle for current date', () => {
    const puzzle = getDailyWordMatrix('2026-11-20');
    expect(puzzle.letters.length).toBeGreaterThanOrEqual(4);
    expect(puzzle.targetWords.length).toBeGreaterThan(0);
  });

  it('verifies correct Arabic word combination', () => {
    const isValid = verifyWordSolution(['ك', 'و', 'ي', 'ز'], 'كويز');
    expect(isValid).toBe(true);
  });

  it('calculates bonus XP correctly for quick solving', () => {
    const reward = calculatePuzzleReward(30 /* seconds */, 3 /* words */);
    expect(reward.coins).toBeGreaterThanOrEqual(15);
    expect(reward.xp).toBeGreaterThanOrEqual(25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/miniGamesEngine.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `miniGamesEngine.ts` and `WordMatrixPuzzle.tsx`**

1. Build word bank categorized by topics with daily calendar seed.
2. Build `WordMatrixPuzzle.tsx` with circular touch/drag node connect in RTL layout, letter feedback, and victory particle burst.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/miniGamesEngine.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/miniGamesEngine.ts src/lib/miniGamesEngine.test.ts src/components/games/WordMatrixPuzzle.tsx
git commit -m "feat(games): implement mini-games engine and Arabic Word Matrix puzzle"
```

---

### Task 4: Cosmic Match (Memory Game) & Daily Lucky Spin Wheel

**Files:**
- Create: `src/components/games/CosmicMatchGame.tsx`
- Create: `src/components/games/DailySpinWheel.tsx`
- Create: `src/components/games/ArcadeHubModal.tsx`
- Test: `src/lib/miniGamesEngine.contract.test.ts`

**Interfaces:**
- Produces: `CosmicMatchGame`, `DailySpinWheel`, `ArcadeHubModal`
- Consumes: `miniGamesEngine.ts` rewards and limits

- [ ] **Step 1: Write failing contract test for game sessions**

```typescript
// src/lib/miniGamesEngine.contract.test.ts
import { describe, expect, it } from 'vitest';
import { generateMemoryCards, determineSpinOutcome } from './miniGamesEngine';

describe('miniGamesEngine game mechanics', () => {
  it('generates 12 cards with matching pairs', () => {
    const cards = generateMemoryCards();
    expect(cards.length).toBe(12);
    const uniqueIds = new Set(cards.map(c => c.pairId));
    expect(uniqueIds.size).toBe(6);
  });

  it('determines server-authoritative spin outcome with valid segment angle', () => {
    const outcome = determineSpinOutcome('user-123', '2026-11-20');
    expect(outcome.segmentIndex).toBeGreaterThanOrEqual(0);
    expect(outcome.segmentIndex).toBeLessThan(8);
    expect(outcome.targetAngle).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/miniGamesEngine.contract.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement Memory Cards Game, Spin Wheel, and Arcade Hub**

1. `CosmicMatchGame.tsx`: 4x3 card flip grid with brand icons, 45s timer, combo multipliers.
2. `DailySpinWheel.tsx`: HTML5 Canvas wheel rendered in Petrol, Teal, Coral slices, spin button with angular deceleration to `outcome.targetAngle`.
3. `ArcadeHubModal.tsx`: Selection modal featuring games with remaining daily plays badges.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/miniGamesEngine.contract.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/games/ src/lib/miniGamesEngine.contract.test.ts src/lib/miniGamesEngine.ts
git commit -m "feat(games): implement Cosmic Match game and Daily Lucky Spin Wheel"
```

---

### Task 5: Re-engineered Rewards Dashboard & 6 Core Pillars

**Files:**
- Create: `src/components/rewards/PointsBalanceCard.tsx`
- Create: `src/components/rewards/LevelProgressRail.tsx`
- Create: `src/components/rewards/DailyGiftMysteryBox.tsx`
- Create: `src/components/rewards/BadgesTrophyHall.tsx`
- Create: `src/components/rewards/VipLeaderboardPodium.tsx`
- Create: `src/components/rewards/RewardLedgerSheet.tsx`
- Create: `src/components/rewards/RewardsDashboard.tsx`
- Modify: `src/components/RewardsSection.tsx` (delegates to `RewardsDashboard`)
- Test: `src/components/rewards/RewardsDashboard.test.tsx`

**Interfaces:**
- Produces: `RewardsDashboard`
- Consumes: `RewardsSummary`, `claimDailyGift`, `getRewardLedger` from `src/lib/db.ts`

- [ ] **Step 1: Write failing component test for `RewardsDashboard`**

```typescript
// src/components/rewards/RewardsDashboard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RewardsDashboard from './RewardsDashboard';

describe('RewardsDashboard', () => {
  it('renders all 6 reward pillars with brand tokens', () => {
    render(<RewardsDashboard userId="test-user" lang="ar" />);
    expect(screen.getByTestId('points-balance-card')).toBeDefined();
    expect(screen.getByTestId('level-progress-rail')).toBeDefined();
    expect(screen.getByTestId('daily-gift-box')).toBeDefined();
    expect(screen.getByTestId('badges-trophy-hall')).toBeDefined();
    expect(screen.getByTestId('vip-leaderboard-podium')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/rewards/RewardsDashboard.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement all 6 Pillar components and `RewardsDashboard`**

Assemble the dashboard with Petrol headers, Bright Teal progress indicators, Coral claim buttons, and Cosmo dark cards. Embed the Cosmo Mascot guide at the bottom corner with spotlight hooks.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/rewards/RewardsDashboard.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/rewards/ src/components/RewardsSection.tsx
git commit -m "feat(rewards): assemble modern 6-pillar RewardsDashboard"
```

---

### Task 6: Avatar Customizer & Store Integration

**Files:**
- Create: `src/lib/avatarCatalog.ts`
- Create: `src/components/rewards/AvatarCustomizerModal.tsx`
- Test: `src/lib/avatarCatalog.test.ts`

**Interfaces:**
- Produces: `getAvailableAvatarFrames()`, `unlockAvatarFrame(userId, frameId)`, `AvatarCustomizerModal`
- Constraint: Spends `coins` only, never `points`/XP.

- [ ] **Step 1: Write failing test for avatar frame catalog**

```typescript
// src/lib/avatarCatalog.test.ts
import { describe, expect, it } from 'vitest';
import { getAvailableAvatarFrames, canPurchaseFrame } from './avatarCatalog';

describe('avatarCatalog', () => {
  it('lists brand-themed avatar frames with coin prices', () => {
    const frames = getAvailableAvatarFrames();
    expect(frames.length).toBeGreaterThanOrEqual(4);
    expect(frames.every(f => f.priceCoins > 0)).toBe(true);
  });

  it('prevents purchasing if user has insufficient coins without touching XP', () => {
    const canBuy = canPurchaseFrame('frame-coral-flame', 10 /* user coins */);
    expect(canBuy).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/avatarCatalog.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `avatarCatalog.ts` and `AvatarCustomizerModal.tsx`**

1. Define 6 luxury frames: Petrol Obsidian, Bright Teal Neon, Coral Comet, Golden Sun, Diamond Crystal, Sand Ivory.
2. Build modal with live avatar preview, purchase button, and equip toggle.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/avatarCatalog.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/avatarCatalog.ts src/lib/avatarCatalog.test.ts src/components/rewards/AvatarCustomizerModal.tsx
git commit -m "feat(avatar): implement coin-based avatar frame customizer and shop modal"
```

---

### Task 7: Playwright End-to-End Verification

**Files:**
- Create: `e2e/rewards-experience.spec.ts`

- [ ] **Step 1: Write Playwright E2E tests for the complete user journey**

```typescript
// e2e/rewards-experience.spec.ts
import { test, expect } from '@playwright/test';

test.describe('QuizSpace Rewards & Gamification Experience', () => {
  test('renders dashboard, interacts with Cosmo mascot, and opens arcade', async ({ page }) => {
    await page.goto('/#/rewards');
    
    // 1. Verify 6 pillars are visible
    await expect(page.locator('[data-testid="points-balance-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="level-progress-rail"]')).toBeVisible();
    await expect(page.locator('[data-testid="daily-gift-box"]')).toBeVisible();
    
    // 2. Verify Cosmo mascot guide bubble appears
    const mascotBubble = page.locator('[data-testid="cosmo-dialogue-bubble"]');
    await expect(mascotBubble).toBeVisible();
    await expect(mascotBubble).toContainText('انضاف جديد');
    
    // 3. Click "خدني هناك" to spotlight arcade
    await page.click('[data-testid="cosmo-take-me-there-btn"]');
    await expect(page.locator('[data-testid="arcade-hub-trigger"]')).toBeVisible();
    
    // 4. Open Arcade and start Cosmic Match
    await page.click('[data-testid="arcade-hub-trigger"]');
    await expect(page.locator('[data-testid="arcade-hub-modal"]')).toBeVisible();
    await page.click('[data-testid="start-cosmic-match-btn"]');
    await expect(page.locator('[data-testid="memory-grid"]')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run Playwright test to verify whole flow**

Run: `npx playwright test e2e/rewards-experience.spec.ts`  
Expected: PASS with video and screenshot traces.

- [ ] **Step 3: Commit**

```bash
git add e2e/rewards-experience.spec.ts
git commit -m "test(e2e): add Playwright end-to-end tests for rewards and Cosmo mascot guide"
```
