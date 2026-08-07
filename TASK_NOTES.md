# Task Notes (v3)

## Current request
User says AI model is slow, wants a better/faster one.

## Current AI model config (worker/src/index.ts)
- OPENROUTER_TEXT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'
- OPENROUTER_VISION_MODEL = 'google/gemma-4-31b-it:free'
- Provider fallback chain: groq -> openai -> deepseek -> openrouter (by feature flags)
- Streaming endpoint: worker /api/ai/openrouter/stream (called from src/services/aiWorkerClient.ts askAIStream)
- Worker deployed via wrangler (worker/ dir, wrangler.toml). Deploy workflow: .github/workflows/deploy.yml pushes both pages + worker.

## Upgrade plan
Replace OPENROUTER_TEXT_MODEL with a faster smart model, e.g. 'deepseek/deepseek-chat-v3.1:free' or 'moonshotai/kimi-k2:free' or 'google/gemini-2.5-flash:free'. Vision: 'google/gemini-2.5-flash-lite:free'.
Pick: text='deepseek/deepseek-chat-v3.1:free' (fast Arabic, quality), vision='google/gemini-2.5-flash:free'.

## State summary
- Assistant name: كوزمو AI / Cosmo AI (final; do not rename to Spark)
- AIChat design: ChatGPT-style dark green (#10a37f), ThinkingOrb, starters; full fixes deployed (minHeight 100dvh, send button green/white, user avatar in own messages)
- Commit chain: ... 75d9606 (avatars), 1ae34fb (spark design), 93ab9d4 (cosmo rename), b114b5f (comments), a6aeb89 (layout fixes)
- Deploy URL: https://koomn1.github.io/quiz-space/ (push main -> gh run completes ~1.5min)
- Avatars in public/avatars/: boy-1..3, girl-1..3 PNGs (verified live)
- Repo: /home/ubuntu/quiz-space, branch main; gh CLI configured
- MessageInbox photo_url fix + avatars both sides; userPhoto/userName/defaultAvatar props passed from App.tsx
