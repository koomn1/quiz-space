# Task Notes (v4)

## Current request (Arabic)
Fix AIChat issues:
1. Cosmo AI avatar must appear on assistant replies (user avatar already shows) — screenshot showed only user avatar; assistant reply not rendered yet (stuck at thinking) OR avatar hidden.
2. Chat still not filling the screen properly (mobile).
3. Chat doesn't switch with dark/light theme (hardcoded #212121/#2f2f2f).
4. AI model: user wants FAST model, SMART, LARGE CONTEXT, good at analysis.

## Model decision (done in worker/src/index.ts)
- Primary: openai/gpt-oss-20b:free (fast, 128K ctx, good Arabic)
- Fallbacks: ['openai/gpt-oss-20b:free', 'qwen/qwen3-235b-a22b:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'meta-llama/llama-3.3-70b-instruct:free']
- allowedModels whitelist now includes openai/gpt-oss-20b:free, qwen/qwen3-235b-a22b:free
- Vision fallbacks unchanged: google/gemma-4-31b-it:free, nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free, google/gemma-4-26b-a4b-it:free
- Streaming SSE endpoint: /api/ai/openrouter/stream loops candidates with stream:true, commits to first OK, proxies SSE raw to browser. No client-side failure handling — if stream never returns tokens (model disabled streaming), reply stays empty string and user sees nothing! IMPORTANT: the user's screenshot (stuck thinking, no reply) suggests the stream connected but returned no tokens or error. Should add: if fullText empty after 30s or no data events for 15s, treat as failed and fall back to next candidate (client retries aren't possible; server must handle). Consider server-side: detect zero-data stream and retry model.

## AIChat.tsx key locations
- Lines 16-20: const ACCENT='#10a37f'; BG='#212121'; CARD='#2f2f2f'; FG='#ececec'; MUTED='#8e8ea0'; (hardcoded — need theme awareness)
- AIChat props (line 31): no darkMode prop. App.tsx line 372 has darkMode state; passes darkMode to some components (Header etc.). Need to pass darkMode to AIChat.
- AssistantAvatar (134): hardcoded green gradient, fine.
- MessageRow (165): user msg shows avatar; assistant msg (195) renders <AssistantAvatar /> — so avatar DOES render for assistant messages; user's issue = reply itself never rendered (stream returned nothing). Fix stream reliability + maybe the reply wasn't added because fullText was empty on error.
- Container (495): `minHeight: '100dvh'` but parent <main> (App.tsx 1338) is flex-1 → 100dvh extends BELOW viewport, and on mobile the header occupies space so 100dvh overflows. Better: use fixed positioning or `height: calc(100dvh - header)` — App header height unknown (~64px on mobile). Since tabs fill page, simplest: AIChat container `className="chat-container fixed inset-0 w-full flex"` with sidebar + main, zIndex? But header z-35. Alternative: compute offset from header height. Choose: position the chat area to fill remaining screen: use `height: calc(100dvh - 56px)` approx for mobile; on desktop header may be 72px. Use a CSS variable approach: pass header height? Simpler: make AIChat use `fixed inset-0` but that covers sidebar. Compromise: absolute positioning inside main: `className="absolute inset-0 flex"` requires parent relative + fixed height.
- Top bar (617): `flex items-center justify-between px-4 py-3 flex-shrink-0` — fine.
- Welcome topbar user chip (600): avatar + userName — existing.
- Theme: detect darkMode prop; if !darkMode use light palette: BG='#f7f7f8', CARD='#ffffff', FG='#3f3f46', MUTED='#71717a', sidebar bg '#f1f1f2', thinking sub-text '#a1a1aa' (#4a4a4a is hardcoded twice: 252, and footer 785). Also borders rgba(255,255,255,0.1) -> light mode rgba(0,0,0,0.08).
- Footer disclaimer (785): color '#4a4a4a'.

## Worker facts
- Worker: worker/ dir, wrangler.toml name=quiz-space-ai, deploy via gh workflow (npm install in worker + npx wrangler deploy). Secrets in Cloudflare (not repo).
- Test of stream endpoint with curl -> HTTP 401 (needs Supabase Authorization token, can't test without user token).
- Worker URL: https://quiz-space-ai.yo01009950871.workers.dev
- Frontend: https://koomn1.github.io/quiz-space/ — deploy via push to main (~1.5 min), verify with gh run list.
- curl deployed bundle: index JS refs AIChat-*.js chunks; verify markers with grep (e.g. userInitial, 100dvh).
- AIChat.tsx askAIStream client: src/services/aiWorkerClient.ts; onChunk updates messages; error caught in sendMessage and console-logged — USER NEVER SEES THE ERROR! Add visible error message (add errorMessage state, show inline).

## Remaining TODO
1. Pass darkMode prop to AIChat in App.tsx (search where AIChat rendered ~line 1553).
2. Make AIChat theme colors responsive to darkMode (theme palette object + borders, topbar bg, sidebar bg #171717 -> #f1f1f2 light).
3. Make chat fill screen: consider `fixed inset-0` overlay approach is cleanest for mobile; or height calc. Recommend: AIChat container fixed inset-0 with z-index below header? Header z-35, main z-10. Put AIChat at z-30 fixed inset-0 -> covers header partially. Better: keep flow layout but set `height: calc(100dvh - 64px)` and on desktop `height: calc(100vh - 80px)`. Also remove outer main padding overflow?
4. Server: retry streaming candidate on empty/errored streams (loop continues on !r.ok; but r.ok with empty stream = commits). Add server-side: after headers received, peek? Complex. Client-side simpler: add timeout fallback — if no chunk in 20s or fullText empty at end, throw error; UI shows retry + error text.
5. UI: show error state in AIChat (retry button).
6. Build worker (npm install in worker + esbuild/wrangler dry-run ok), commit both, push, verify deploy.

## Branding
Assistant name: كوزمو AI / Cosmo AI (do NOT rename to Spark).
## Progress update (v5) — what's done vs remaining
Done:
- Worker models updated: primary openai/gpt-oss-20b:free; fallbacks [..., qwen/qwen3-235b-a22b:free, nvidia/nemotron-3-super-120b-a12b:free, meta-llama/llama-3.3-70b-instruct:free]; allowedModels whitelist updated. (worker/src/index.ts)
- App.tsx passes darkMode to AIChat.
- AIChat.tsx: usePalette(darkMode) added; MessageRow/FormattedText/ThinkingRow accept theme; container changed to `fixed inset-0 w-full flex overflow-hidden` (fixes fullscreen!); lastError state + retryLastMessage added (but retry wired — sendMessage still uses inputText dep; careful: retry sends lastUser.text.replace... — verify); empty assistant placeholder removal in catch (uses Date.now()+1 which may not match placeholder id — actually aiMsgId = Date.now()+1 computed at send time; by catch time Date.now() changed! Placeholder id mismatch risk. FIX: store aiMsgId in ref or const; simplest: in catch remove messages where role==='assistant' && text==='' (empty string placeholders).
- Remaining hardcoded theme spots to finish in AIChat.tsx (lines 559+): sidebar top buttons (MUTED->theme.MUTED at ~576, 584, 591, 652), sidebar search input, welcome cards (CARD/background #363636 hover), chat divider, input area (CARD background, BORDER, FG, textarea FG, image preview remove bg '#ef4444' ok, send button SEND_ACTIVE_FG, disclaimer '#4a4a4a' -> theme.SUBTLE_TEXT), welcome screen overlay (rgba(10,10,10,0.75)/#2f2f2f -> theme.OVERLAY_*, FG/MUTED), scrollbar CSS uses rgba(255,255,255,x) — theme SCROLL_THUMB, ThinkingRow subtitle, message action hover:bg-white/10 -> inline hover handlers.
- Note: line 481 setMessages filter uses (Date.now()+1) which is WRONG (time changed); fix to filter `role === 'assistant' && !m.text`.

Still to do:
1. Fix placeholder removal in catch (filter empty-text assistant msgs).
2. Wire retryLastMessage into UI: show error banner above input (or below thinking) with retry button; also disable during analyzing.
3. Theme remaining hardcoded colors (list above).
4. npx vite build (root), commit+push, verify deploy (gh run list; grep deployed chunks for 'fixed inset-0' / usePalette / gpt-oss).
5. Worker: push already included model changes (in same commit as index.ts). Worker deploy runs in same workflow. Verify worker chunk contains gpt-oss string too.
6. Tell user in final message: faster model (gpt-oss-20b primary + qwen3-235b fallback with 131K ctx), Cosmo avatar (AssistantAvatar always rendered on assistant rows — if still missing it means stream empty -> now shows error banner + retry), fullscreen fixed inset-0, dark/light theme palette.

## Key facts
- Repo: /home/ubuntu/quiz-space, push main -> gh workflow deploys frontend + worker.
- Worker builds with `npm install` in worker/ + `npx wrangler deploy`.
- Cannot test stream endpoint without Supabase token (401).
- Site: https://koomn1.github.io/quiz-space/
## v6 remaining fixes in AIChat.tsx (exact strings to find)
1. Line ~253 still: `style={{ color: copiedMsgId === msg.id && k === 0 ? ACCENT : theme.MUTED }}` — OK already done.
2. Welcome card title/sub still use FG/MUTED globals: find `<p className="text-sm font-medium" style={{ color: FG }}>{title}</p>` and `<p className="text-xs mt-0.5" style={{ color: MUTED }}>{sub}</p>` → theme.FG/theme.MUTED.
3. Sidebar top: `<PanelLeftClose className="w-5 h-5" style={{ color: MUTED }} />` and Search `<Search className="w-5 h-5" style={{ color: MUTED }} />` and SquarePen `style={{ color: theme.MUTED }}` — panel left uses MUTED global; Pencil (rename) `style={{ color: MUTED }}` → theme.MUTED.
4. Overlay heading `<h3 className="text-lg font-semibold" style={{ color: FG }}>` → theme.FG; `<p className="text-sm" style={{ color: MUTED }}>` → theme.MUTED.
5. Overlay bg: `className="bg-[#2f2f2f] border border-white/10 rounded-3xl p-8 max-w-sm text-center space-y-4"` was replaced with inline style already (check it landed).
6. Add error banner UI: after `{isAnalyzing && <ThinkingRow isAr={isAr} />}` add: `{lastError && !isAnalyzing && (<div className="flex items-center justify-center gap-2 py-3"><p className="text-sm" style={{color: '#ef4444'}}>{lastError}</p><button onClick={retryLastMessage} ... retry</button></div>)}` with theme colors (use ACCENT button bg).
7. Scrollbar CSS at end still rgba(255,255,255,...) → use template literal with theme.SCROLL_THUMB / _HOVER.
8. Sidebar user chip: `<span className="text-sm text-white/80 flex-1 truncate">` → darkMode ? 'text-white/80' : 'text-black/70'.
9. Search input: done (inline style).
10. Then: npx vite build, commit+push, verify deploy: grep chunks for 'fixed inset-0' and 'gpt-oss'.
11. Worker chunk also deployed by workflow; verify gpt-oss in main bundle too (AI worker is separate domain, not bundled in pages assets).
