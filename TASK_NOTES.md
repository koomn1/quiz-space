# Task Notes (updated 2)

## User request (Arabic, second message)
Take the uploaded package design (/home/ubuntu/upload/AIChatforQuizSpace(1).zip, extracted to /home/ubuntu/aichat_package/) and put it in place of Cosmo in quiz-space, rename it, wire to DB, fix everything.

## Design applied
ChatGPT-like dark theme: bg #212121, cards #2f2f2f, accent emerald #10a37f, fg #ececec, muted #8e8ea0. Components ported: ThinkingOrb (GSAP SVG), AssistantAvatar (green gradient + Sparkles), FormattedText (**bold**), MessageRow (gsap fade, copy/thumbs up-down/regenerate buttons), ThinkingRow (typewriter "سبارك بيفكر..."), Welcome starters (اشرحلي درس/لخصلي المادة/اختبرني/حضرني للامتحان), Sidebar 260px with DB conversation groups (اليوم/أمس/الأسبوع الماضي via groupLabel), rename/delete conv, user chip, topbar dropdown, rounded-3xl input with image attach + white Send arrow, footer disclaimer, custom scrollbar CSS.

## Renaming
Cosmo -> "سبارك" (Spark). Constants ASSISTANT_NAME_AR/EN in src/pages/AIChat.tsx. Welcome text, thinking label, disclaimer all renamed.

## DB wiring (kept real)
- getAIChatConversations / createAIChatConversation / renameAIChatConversation / deleteAIChatConversation / getAIChatHistory / saveAIChatMessage (role 'cosmo') in src/lib/db.ts; messages table col role='cosmo' (saved as 'cosmo' as any; display role converts cosmo->assistant).
- askAIStream signature: (prompt, {systemInstruction?, history?, image?}, onChunk(delta, full)) from services/aiWorkerClient.ts — used with image support {data, mimeType}.
- Unauthenticated users see an auth overlay inviting sign-in.

## Remaining
1. Check MessageInbox COSMO_ADMIN_UID naming OK to keep (it's internal uid, fine). Check if sidebar/header elsewhere shows "كوزمو" name that should change (Header search? CosmoOrb still used in CosmoOrb.tsx component — no longer imported by AIChat).
2. Build (npx vite build), commit, push main -> auto deploy to https://koomn1.github.io/quiz-space/ (verify after workflow; gh run list; check avatars PNG 200 + chunk refs).
3. Deliver result.

## First request status (done & deployed)
New avatars boy-1..3 girl-1..3 PNGs in public/avatars/ (old SVGs + cosmo.svg deleted). MessageInbox shows avatars both sides + photo_url fix. AIChat user-photo bubbles. UserProfile PNG grid. Commit 75d9606 pushed, deployed verified.

## Deploy facts
- Workflow: .github/workflows/deploy.yml (push main -> pages deploy + worker deploy)
- Verify: curl -s https://koomn1.github.io/quiz-space/avatars/boy-1.png => 200; index JS references userPhoto/photo_url; new chunk AIChat-*.js has accent green refs.
