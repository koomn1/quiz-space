# Task 7 Brief: Playwright End-to-End Verification

## Context
Plan: `docs/superpowers/plans/2026-11-20-rewards-gamification.md`
Spec: `docs/superpowers/specs/2026-11-20-rewards-gamification-design.md`

## Deliverables
1. `e2e/rewards-experience.spec.ts`:
   - Comprehensive Playwright tests covering:
     1. Complete dashboard rendering (`data-testid="rewards-dashboard"`).
     2. Brand color checks: Petrol (`#007472`), Bright Teal (`#2AC3BB`), Coral (`#EE8361`), and Cosmo Surface.
     3. Cosmo 3D Mascot guide appearance:
        - Canvas presence (`data-testid="cosmo-guide-canvas"`).
        - Dialogue speech bubble (`data-testid="cosmo-dialogue-bubble"`).
        - Clicking "خدني هناك" activates spotlight and scrolls to Arcade Hub.
        - Clicking dismiss updates localStorage and hides speech bubble.
     4. Arcade Hub Modal:
        - Opening Arcade modal (`data-testid="arcade-hub-modal"`).
        - Launching Cosmic Memory Match game and verifying cards grid.
        - Launching Word Matrix Puzzle and verifying Arabic letter nodes.
        - Launching Daily Spin Wheel and verifying spin action.
     5. Avatar Frame Store Modal:
        - Opening Avatar Customizer modal (`data-testid="avatar-customizer-modal"`).
        - Verifying coin prices and preview frame.
     6. Responsiveness check on Mobile viewport (390x844).
2. Run Playwright: `npx playwright test e2e/rewards-experience.spec.ts`.
3. Commit: `git add e2e/rewards-experience.spec.ts` and `git commit -m "test(e2e): add Playwright end-to-end tests for rewards and Cosmo mascot guide"`.
