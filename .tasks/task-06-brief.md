# Task 6 Brief: Avatar Customizer & Store Integration

## Context
Plan: `docs/superpowers/plans/2026-11-20-rewards-gamification.md`
Spec: `docs/superpowers/specs/2026-11-20-rewards-gamification-design.md`

## Constraint
Purchases in the Avatar Store spend `coins` ONLY, and must NEVER deduct `points` (XP) or derank the user.

## Deliverables
1. `src/lib/avatarCatalog.ts`:
   - List of brand-themed luxury avatar frames:
     - `frame-petrol-obsidian`: 50 Coins
     - `frame-bright-teal-neon`: 100 Coins
     - `frame-coral-flame`: 200 Coins
     - `frame-golden-cosmo`: 350 Coins
     - `frame-diamond-celestial`: 500 Coins
     - `frame-sand-ivory`: 75 Coins
   - `getAvailableAvatarFrames(): AvatarFrameItem[]`
   - `canPurchaseFrame(frameId: string, userCoins: number): boolean`
   - `getUserUnlockedFrames(userId: string): string[]`
   - `unlockAvatarFrame(userId: string, frameId: string): Promise<{ success: boolean; newCoins: number }>`
2. `src/components/rewards/AvatarCustomizerModal.tsx`:
   - Interactive modal:
     - Big live avatar preview showing the equipped frame.
     - Grid of available frames with coin prices and unlock status.
     - "شراء (Buy)" button for locked frames and "تجهيز (Equip)" button for unlocked ones.
     - Balance indicator showing current user Quiz Coins.
     - Micro-interaction celebration when a frame is unlocked.
3. `src/lib/avatarCatalog.test.ts`:
   - Unit tests validating frame retrieval, price checks, and coin affordability.
4. Run: `npx vitest run src/lib/avatarCatalog.test.ts`.
5. Commit: `feat(avatar): implement coin-based avatar frame customizer and shop modal`.
