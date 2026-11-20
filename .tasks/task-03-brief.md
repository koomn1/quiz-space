# Task 3 Brief: Arcade Mini-Games Engine & Word Matrix Puzzle

## Context
Plan: `docs/superpowers/plans/2026-11-20-rewards-gamification.md`
Spec: `docs/superpowers/specs/2026-11-20-rewards-gamification-design.md`

## Deliverables
1. `src/lib/miniGamesEngine.ts`:
   - Curated Arabic educational word bank categorized by topics (e.g. `علوم`, `تاريخ`, `لغة`, `تكنولوجيا`, `فضاء`).
   - `getDailyWordMatrix(dateString?: string): WordMatrixPuzzleData`
     - Deterministic puzzle selection based on date string (YYYY-MM-DD).
     - Returns letter pool (isolated Arabic characters e.g. `['ك', 'و', 'ي', 'ز', 'س', 'ب', 'ي', 'س']`) and target solvable words.
   - `verifyWordSolution(selectedLetters: string[], targetWord: string): boolean`
   - `calculatePuzzleReward(timeSeconds: number, wordsFoundCount: number): { coins: number; xp: number }`
   - `getDailyGameAllowance(userId: string, gameId: MiniGameId): { remainingPlays: number; maxDailyPlays: number; canPlay: boolean }`
   - `recordGamePlay(userId: string, gameId: MiniGameId, score: number): MiniGameSession`
2. `src/components/games/WordMatrixPuzzle.tsx`:
   - Interactive puzzle UI:
     - Top bar with Topic tag (e.g. `علوم وابتكار`), found words counter, and timer.
     - Found words display: boxes showing discovered words with green/teal checkmarks, and dashed boxes for remaining words.
     - Interactive circular or matrix letter nodes:
       - Displays isolated Arabic glyphs with Petrol `#007472` background, Teal `#2AC3BB` borders, and Ivory `#FCF6EE` text.
       - Supports touch swipe / drag or click-to-connect.
       - Active connection line or highlighted connected letters.
     - Action buttons: "مسح (Clear)", "تلميح (Hint - 5 عملات)".
     - Victory modal when all words are found with celebration particles, coins earned (+20), and XP (+30).
3. `src/lib/miniGamesEngine.test.ts`:
   - Tests for deterministic daily generation, word validation, reward calculations, and daily limits.
4. Run: `npx vitest run src/lib/miniGamesEngine.test.ts`.
5. Commit: `feat(games): implement mini-games engine and Arabic Word Matrix puzzle`.
