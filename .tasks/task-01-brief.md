# Task 1 Brief: Reward Presentation & Gamification Types

## Context
We are implementing the QuizSpace Rewards Experience & 3D Mascot Gamification feature.
Plan: `docs/superpowers/plans/2026-11-20-rewards-gamification.md`
Spec: `docs/superpowers/specs/2026-11-20-rewards-gamification-design.md`

## Brand Colors Rule (Strict)
- Petrol: `#007472` (`--color-petrol`)
- Bright Teal: `#2AC3BB` (`--color-bright-teal`)
- Coral: `#EE8361` (`--color-coral`)
- Ivory: `#FCF6EE` (`--color-ivory`)
- Sand: `#FBDFC7` (`--color-sand`)
- Surface: `#072424` (`--color-theme-surface`)

## Task Deliverable
1. Extend `src/types.ts`:
   - `CosmoTourState`: `{ currentStep: string; dismissedSteps: string[]; hasSeenArcadeIntro: boolean }`
   - `MiniGameId`: `'cosmic_match' | 'word_matrix' | 'spin_wheel'`
   - `MiniGameSession`: `{ id: string; gameId: MiniGameId; score: number; completed: boolean; rewardCoins: number; rewardXp: number }`
   - `WordMatrixPuzzleData`: `{ id: string; topic: string; topicAr: string; letters: string[]; targetWords: string[] }`
   - `AvatarFrameItem`: `{ id: string; name: string; nameAr: string; priceCoins: number; frameClass: string; unlocked?: boolean }`
   - Update `RewardBadge` or add rarity: `'common' | 'rare' | 'legendary'`
2. Update `src/lib/rewardPresentation.ts`:
   - `getBadgeRarityStyle(rarity: 'common' | 'rare' | 'legendary')`: returns `{ borderColor: string; glowColor: string; bgGradient: string }` honoring the brand tokens (Coral for Legendary, Bright Teal for Rare, Petrol/Border for Common).
   - Update `getRewardEventLabel` to support mini-games:
     - `'mini_game_cosmic_match'`: `'لعبة تطابق الذاكرة'` (AR) / `'Cosmic Memory Match'` (EN)
     - `'mini_game_word_matrix'`: `'لعبة مصفوفة الكلمات'` (AR) / `'Word Matrix Puzzle'` (EN)
     - `'mini_game_spin_wheel'`: `'عجلة الحظ اليومية'` (AR) / `'Daily Lucky Spin Wheel'` (EN)
     - `'avatar_frame_purchase'`: `'شراء إطار الأفاتار'` (AR) / `'Avatar Frame Purchase'` (EN)
3. Write / update unit tests in `src/lib/rewardPresentation.test.ts`.
4. Run `npx vitest run src/lib/rewardPresentation.test.ts` to ensure all tests pass.
5. Commit changes with message: `feat(rewards): extend gamification types and luxury presentation helpers`.
