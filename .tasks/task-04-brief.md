# Task 4 Brief: Cosmic Match (Memory Game) & Daily Lucky Spin Wheel

## Context
Plan: `docs/superpowers/plans/2026-11-20-rewards-gamification.md`
Spec: `docs/superpowers/specs/2026-11-20-rewards-gamification-design.md`

## Deliverables
1. `src/components/games/CosmicMatchGame.tsx`:
   - Memory card match game:
     - 4x3 grid (12 cards = 6 matching pairs).
     - Cards use QuizSpace icons (Star, Trophy, Sparkles, BookOpen, Crown, Flame) with Petrol `#007472` back side and Ivory `#FCF6EE` front side with Teal border.
     - 45s countdown timer.
     - Smooth 3D flip card animation on click.
     - Pair match celebration with green/teal border.
     - Game over / Win screen rewarding 15-30 Quiz Coins and XP based on time remaining.
2. `src/components/games/DailySpinWheel.tsx`:
   - Interactive Spin Wheel:
     - 8 alternating segments colored in Petrol (`#007472`), Bright Teal (`#2AC3BB`), Coral (`#EE8361`), and Sand (`#FBDFC7`).
     - Segment labels in Arabic (e.g. `+10 عملات`, `+25 XP`, `+50 عملة`, `تجميد الستريك`, `+100 XP`, `صندوق مفاجأة`, `+15 عملة`, `مضاعف 2x`).
     - Center spin button with pulsating Coral glow.
     - Physics: Smooth angular deceleration with realistic spin easing to pre-determined outcome.
     - Server-authoritative: calls `determineSpinOutcome()` from `miniGamesEngine.ts` to get `targetAngle` and prize.
     - Confetti burst on landing with prize celebration dialog.
3. `src/components/games/ArcadeHubModal.tsx`:
   - Modal drawer / popup presenting the 3 mini-games:
     - 1. لغز مصفوفة الكلمات (Word Matrix Puzzle)
     - 2. تطابق الذاكرة (Cosmic Memory Match)
     - 3. عجلة الحظ اليومية (Daily Lucky Spin Wheel)
   - Each card displays remaining daily plays badge (`متبقي 3 محاولات اليوم` or `متاحة الآن`).
   - Clicking a card opens that specific mini-game.
4. `src/lib/miniGamesEngine.contract.test.ts`:
   - Vitest contract tests for `generateMemoryCards()`, `determineSpinOutcome()`, and reward payouts.
5. Run: `npx vitest run src/lib/miniGamesEngine.contract.test.ts`.
6. Commit: `feat(games): implement Cosmic Match game and Daily Lucky Spin Wheel`.
