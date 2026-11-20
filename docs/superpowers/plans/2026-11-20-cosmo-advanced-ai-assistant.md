# Cosmo Advanced AI Assistant & Active File Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Cosmo into a world-class AI Assistant (comparable to ChatGPT/Gemini) with full QuizSpace platform awareness, active session file memory across multi-turn chats, dual-path quiz handling (Literal Extraction vs. Pedagogical Generation), a React Bits animated thinking background, and a smooth typewriter streaming effect.

**Architecture:** 
1. **React Bits Background (`Waves`)**: WebGL2 fluid silk wave backdrop mounted behind chat, transitioning smoothly (`opacity-0` -> `opacity-40`) during thinking (`isAnalyzing`), and fading out smoothly when done.
2. **Typewriter Streaming Buffer**: RAF-based progressive unspooling buffer in `CosmoThinkingIndicator.tsx` that reveals tokens character-by-character at 12–16ms cadence with a blinking teal cursor.
3. **Active Session File Vault (`activeConversationAttachment`)**: Persistent conversation-scoped file state stored in IndexedDB and pinned in UI with a chip, ensuring follow-up messages resolve "الملف" / "منه" without amnesia.
4. **Dual-Path Routing Engine**: Strict intent separation between Literal Question Extraction (`extractionMode: 'literal'`) and Pedagogical Generation (`generate` with interactive settings confirmation).
5. **Full Site Awareness & Tool Calling**: Rich system prompt knowledge of all QuizSpace tools (`/rooms`, `/create`, `/classrooms`, `/rewards`, `/explore`, `/leaderboard`) with in-chat actionable cards.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, WebGL2 (React Bits `Waves`), Vitest, IndexedDB (`tempFileStorage`), Supabase / AI Worker.

**Spec:** Approved Brainstorming Specification in conversation transcript & artifact `cosmo_deep_audit_and_design_system.md`.

## Global Constraints
- Preserve 100% of contract test strings required by `src/pages/AIChat.file-quiz.contract.test.ts` and `src/pages/AdminRecovery.contract.test.ts`.
- Never store user files in backend database; files are local device only (IndexedDB sandbox).
- Visual tokens: Royal Petrol `#007472`, Bright Teal `#2AC3BB`, Warm Coral `#EE8361`, Ivory `#FCF6EE`.
- All vitest tests must pass (`24/24` + contract tests) and `npx vite build` must exit 0 cleanly.

## Review Focus
1. Multi-turn anaphora resolution: User uploads file in turn 1 ("اشرح لي"), then in turn 2 says "طلع الأسئلة اللي فيه" without re-uploading; Cosmo must bind to the existing active file.
2. Literal extraction vs. generation: User saying "طلع كل الأسئلة اللي في الملف" must invoke `createExtractionJob` with `extractionMode: 'literal'` and never truncate or synthesize new questions.
3. Active file dismiss: User clicks (✕) on the active file chip; subsequent messages treat the conversation as text-only.
4. Typewriter stream cancellation: If user hits Stop or new prompt arrives, typewriter queue must drain or cancel cleanly without orphan timers.
5. React Bits performance: `Waves` WebGL canvas must pause or unmount when inactive to conserve GPU/battery.

---

### Task 1: Fetch and Install React Bits `Waves` Component
**Files:**
- Create: `src/components/cosmo/backgrounds/Waves.tsx`
- Test: `src/components/cosmo/backgrounds/Waves.test.tsx`

- [ ] Run `node .agents/skills/react-bits/scripts/rb-add.mjs Waves --variant TS-TW --dest src/components/cosmo/backgrounds` to fetch the authentic React Bits component.
- [ ] Inspect the generated `Waves.tsx` file for TypeScript compatibility (`import type` where needed).
- [ ] Write unit test in `Waves.test.tsx` verifying component renders cleanly in DOM and exposes props (`lineColor`, `accentColor`, `backgroundColor`, `opacity`).
- [ ] Run `npx vitest run src/components/cosmo/backgrounds/Waves.test.tsx`.
- [ ] Commit with message `feat(cosmo): add React Bits Waves background component`.

---

### Task 2: Build Smooth Character-by-Character Typewriter Streaming Component
**Files:**
- Create: `src/components/cosmo/CosmoTypewriter.tsx`
- Modify: `src/components/cosmo/CosmoThinkingIndicator.tsx`
- Test: `src/components/cosmo/CosmoTypewriter.test.tsx`

- [ ] Create `CosmoTypewriter.tsx` with a high-performance RAF unspooling buffer that smoothly releases incoming streaming text at 12–16ms per character with dynamic burst handling.
- [ ] Add blinking teal cursor indicator (`bg-[#2AC3BB] animate-pulse`).
- [ ] Integrate `CosmoTypewriter` into `StreamingRow` inside `CosmoThinkingIndicator.tsx`.
- [ ] Write tests in `CosmoTypewriter.test.tsx` verifying progressive character reveal, rapid burst flushing, and unmount cleanup.
- [ ] Run `npx vitest run src/components/cosmo/CosmoTypewriter.test.tsx`.
- [ ] Commit with message `feat(cosmo): implement fluid typewriter streaming effect for AI responses`.

---

### Task 3: Active Session File Vault in `tempFileStorage` & `AIChat`
**Files:**
- Modify: `src/services/tempFileStorage.ts`
- Modify: `src/pages/AIChat.tsx`
- Test: `src/services/tempFileStorage.test.ts`

- [ ] Add `getLatestTempAttachmentForConversation(conversationId: string)` in `tempFileStorage.ts`.
- [ ] In `AIChat.tsx`, introduce `activeFileAttachment` state and ref (`activeFileAttachmentRef`), retaining uploaded files across turns for the current conversation.
- [ ] Persist `activeFileAttachment` into IndexedDB with `conversationId`.
- [ ] Add Persistent Active File Banner/Chip in `AIChat.tsx` above the PromptBar:
  - Displays file icon, filename, formatted size, and status `جاهز للاستخراج أو التوليد`.
  - Includes a clear/remove button (✕) to detach the file if the user wants to start a fresh topic.
- [ ] When switching conversations, automatically restore or clear `activeFileAttachment` corresponding to that conversation.
- [ ] Commit with message `feat(cosmo): add persistent active file vault across multi-turn conversation`.

---

### Task 4: Dual-Path Routing Engine (Literal Extraction vs. Generation)
**Files:**
- Modify: `src/pages/AIChat.tsx`
- Modify: `src/lib/cosmo/cosmoPedagogy.ts`
- Test: `src/pages/AIChat.file-quiz.contract.test.ts`

- [ ] In `AIChat.tsx`, update intent detection in `sendMessage`:
  - When the user asks for quiz or questions ("طلع الأسئلة", "كويز", "اختبرني", "امتحان", "استخرج"):
  - Check if `activeFileAttachment` exists even if no new file was dropped in this turn.
  - If file exists, bind it as `attachmentForQuiz`.
- [ ] Add dual-path intent differentiation:
  - **Literal Extraction Intent**: Match phrases like `/(استخرج|استقراء|طلع|هات|أخرج|كل الأسئلة|الأسئلة اللي في الملف|بنك الأسئلة|حرفي|نصي)/i` without "ولّد" or "جديد".
    - Directs to `createExtractionJob` with `extractionMode: 'literal'`, keeping questions, options, and keys verbatim.
  - **Pedagogical Generation Intent**: Match phrases like `/(ولد|ولّد|أنشئ|اصنع|اعمل كويز|اختبرني|لخص في كويز)/i`.
    - Directs to `CosmoQuizStudioModal` / `pendingQuiz` with mode `'generate'`, displays settings confirmation card, and lets user adjust question count, difficulty, and type before generation.
- [ ] Verify that all contract strings in `AIChat.file-quiz.contract.test.ts` remain strictly intact.
- [ ] Run `npx vitest run src/pages/AIChat.file-quiz.contract.test.ts`.
- [ ] Commit with message `feat(cosmo): implement dual-path routing for literal extraction and quiz generation`.

---

### Task 5: Mount React Bits `Waves` Background in `AIChat`
**Files:**
- Modify: `src/pages/AIChat.tsx`
- Test: `src/pages/AIChat.file-quiz.contract.test.ts`

- [ ] Mount `Waves` background behind the chat messages container in `AIChat.tsx`:
  - Position: `pointer-events-none absolute inset-0 z-0 overflow-hidden`
  - Colors: `lineColor={theme.IS_DARK ? '#007472' : '#2AC3BB'}`, `accentColor="#EE8361"`, `backgroundColor="transparent"`.
  - Opacity transition: `transition-opacity duration-700 ease-out`, `opacity-40` when `isAnalyzing` is true, `opacity-0` when false.
  - Set `paused={!isAnalyzing}` so WebGL renders only while Cosmo is active/thinking, conserving power.
- [ ] Commit with message `feat(cosmo): mount reactive thinking Waves background in AIChat`.

---

### Task 6: Full QuizSpace Site Awareness & In-Chat Actionable Cards
**Files:**
- Modify: `src/lib/cosmo/cosmoPedagogy.ts`
- Modify: `src/components/cosmo/CosmoMarkdown.tsx`
- Test: `src/lib/cosmoQuizCount.test.ts`

- [ ] Enrich `COSMO_PERSONALITY` with full site awareness of QuizSpace routes and capabilities:
  - Multi-player Battle Rooms (`/rooms`) with PIN join and real-time competition.
  - Quiz Creator Studio (`/create`) for manual, AI, and batch authoring.
  - Classroom LMS (`/classrooms`) for student assignments and grading.
  - Daily Mystery Chest & Wheel of Fortune (`/rewards`).
  - Explore Catalog (`/explore`) with category tags and trending quizzes.
  - Solo Practice, Word Matrix, and Global Leaderboard (`/leaderboard`).
- [ ] In `CosmoMarkdown.tsx`, support interactive action cards (e.g. `[action:create_quiz]`, `[action:open_rooms]`, `[action:extract_file]`) rendering rich, styled QuizSpace action pills that users can click to navigate or trigger tools immediately.
- [ ] Commit with message `feat(cosmo): enrich platform knowledge and in-chat actionable tool pills`.

---

### Task 7: Comprehensive Verification & Build
**Files:**
- Run all test suites
- Run `npx vite build`

- [ ] Run `npx vitest run` across all Cosmo test suites:
  - `src/pages/AIChat.file-quiz.contract.test.ts`
  - `src/pages/AdminRecovery.contract.test.ts`
  - `src/lib/cosmoQuizCount.test.ts`
  - `src/lib/cosmoTourGuide.test.ts`
  - `src/components/mascot/CosmoDialogueBubble.test.ts`
  - New unit tests (`Waves.test.tsx`, `CosmoTypewriter.test.tsx`, `tempFileStorage.test.ts`)
- [ ] Run `npx vite build` to ensure zero compilation or bundle errors.
- [ ] Push to `origin/main`.
