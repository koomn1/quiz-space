# Task 5 Brief: Re-engineered Rewards Dashboard & 6 Core Pillars

## Context
Plan: `docs/superpowers/plans/2026-11-20-rewards-gamification.md`
Spec: `docs/superpowers/specs/2026-11-20-rewards-gamification-design.md`

## Deliverables
Build modular components for the 6 core pillars under `src/components/rewards/` and wire them into `RewardsDashboard.tsx`:

1. `PointsBalanceCard.tsx`:
   - Dual currency card: Points (XP) with blue/teal progress and Quiz Coins with golden/amber shimmer.
   - Animated count-up numbers.
   - Buttons: "سجل العمليات (Ledger Sheet)" and "متجر الإطارات (Avatar Store)".
   - Button to trigger Arcade Hub modal: "أركيد الألعاب والألغاز" (with glowing badge).

2. `LevelProgressRail.tsx`:
   - Current level (1-100) and VIP Tier badge (Bronze, Silver, Gold, Platinum).
   - Smooth progress bar with percentage to next level.
   - Upcoming perks tooltip.

3. `DailyGiftMysteryBox.tsx`:
   - 3D-styled interactive chest box that shakes when ready to claim (`dailyGift.canClaimToday`).
   - Clicking triggers claim animation with floating coin particles and success toast.

4. `DailyChallengesList.tsx` & `WeeklyTasksBoard.tsx`:
   - Interactive challenge cards with progress bars (e.g. 2/3 quizzes completed), claim buttons for completed tasks.

5. `BadgesTrophyHall.tsx`:
   - 3D hover tilt cards with rarity borders (Legendary = Coral glow, Rare = Teal glow, Common = Petrol).
   - Filter tabs: 'الكل', 'مكتملة', 'قيد التقدم'.

6. `VipLeaderboardPodium.tsx`:
   - Visual podium for top 3 (1st Gold, 2nd Silver, 3rd Bronze).
   - Sticky current user rank card at the bottom.

7. `RewardLedgerSheet.tsx`:
   - Slide-over drawer showing paginated transactions with type filter (الكل، كويزات، ألعاب، هدايا، متجر).

8. `RewardsDashboard.tsx`:
   - Assembles all pillars in a responsive, glassmorphic layout.
   - Integrates `CosmoGuideCanvas`, `CosmoDialogueBubble`, and `CosmoTourSpotlight`.
   - Embeds `ArcadeHubModal` and `AvatarCustomizerModal`.
   - Replaces the inner layout of `RewardsSection.tsx` while keeping backward compatibility with existing props (`userId`, `lang`).

9. `src/components/rewards/RewardsDashboard.test.tsx`:
   - Unit tests checking all 6 pillars render with test IDs and theme tokens.

10. Run tests: `npx vitest run src/components/rewards/RewardsDashboard.test.tsx`.
11. Commit: `feat(rewards): assemble modern 6-pillar RewardsDashboard`.
