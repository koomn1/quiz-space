# Task 2 Brief: Cosmo 3D Mascot & "What's New" Guide System

## Context
Plan: `docs/superpowers/plans/2026-11-20-rewards-gamification.md`
Spec: `docs/superpowers/specs/2026-11-20-rewards-gamification-design.md`

## Deliverables
1. `src/lib/cosmoTourGuide.ts`:
   - Functions:
     - `getTourState(): CosmoTourState`
     - `dismissTourStep(stepId: string): void`
     - `markFeatureSeen(featureId: string): void`
     - `shouldShowTour(featureId: string): boolean`
     - `resetTourGuide(): void`
   - Backed by `localStorage` (`quizspace_cosmo_tour_v1`).
2. `src/components/mascot/CosmoGuideCanvas.tsx`:
   - 3D Mascot rendered using Three.js (procedural canvas, no external GLTF downloads to keep it ultra-fast and 60fps).
   - Character geometry:
     - Sphere head / helmet with Petrol (`#007472`) finish.
     - Bright Teal (`#2AC3BB`) glowing visor face.
     - Coral (`#EE8361`) antenna / badge accent.
     - Soft levitation animation (`Math.sin(clock.getElapsedTime())`).
     - Interactive state props: `state?: 'idle' | 'wave' | 'celebrate' | 'guide'`.
     - Clicking on the canvas triggers a cheerful spin / wave reaction.
3. `src/components/mascot/CosmoDialogueBubble.tsx`:
   - Friendly speech balloon with speech arrow pointing to Cosmo.
   - Text in Arabic (with English fallback support):
     - Title: "مرشد كويز سبيس (كوزمو)"
     - Message: "شوف إيه اللي انضاف جديد في كويز سبيس! لقد أضفنا ألعاب ألغاز جديدة وعجلة الحظ لجمع المزيد من النقاط، اضغط هنا لتجربتها!"
   - Action buttons:
     - Primary: "خدني هناك" (Take me there) with Coral/Teal glow.
     - Secondary / Close: "فهمت، شكراً يا كوزمو" (Dismiss).
4. `src/components/mascot/CosmoTourSpotlight.tsx`:
   - Visual overlay component with CSS clip-path or backdrop highlighting a target DOM element with a pulsing Bright Teal ring.
5. `src/lib/cosmoTourGuide.test.ts`:
   - Vitest suite testing `getTourState`, `dismissTourStep`, `shouldShowTour`, and persistence.
6. Verify tests with `npx vitest run src/lib/cosmoTourGuide.test.ts`.
7. Commit: `feat(mascot): implement Cosmo 3D procedural guide and spotlight tour`.
