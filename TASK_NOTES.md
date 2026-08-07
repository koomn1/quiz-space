# Task Notes: New Avatars + Show Avatars in Cosmo/Class Chats

## Repo
- /home/ubuntu/quiz-space (cloned from koomn1/quiz-space, branch main)
- Deploy: GitHub Pages via .github/workflows/deploy.yml (push to main triggers build + deploy pages; URL https://koomn1.github.io/quiz-space/)
- Build: `npx vite build` works (npm install succeeded; pnpm lockfile mismatch).
- Supabase users table column: `photo_url` (see supabase/migrations/20260728_complete_schema.sql line 26)

## Key code findings
- Avatars live in `public/avatars/`. OLD: 7 SVGs (boy-1..3, girl-1..3, cosmo.svg) — DELETED. NEW: 6 PNGs (boy-1..3, girl-1..3) generated, resized to 512px.
- DB bug: MessageInbox read `p.avatar_url` but users table has `photo_url` — fixed to `p.photo_url || p.avatar_url`.
- AIChat (src/pages/AIChat.tsx): user messages used <Plus /> icon. Now uses user photo (userPhoto/userName props passed from App.tsx).
- MessageInbox (src/components/MessageInbox.tsx): 
  - member list avatars + chat header: now show member photo, fallback FALLBACK_AVATAR (./avatars/boy-1.png)
  - chat bubbles: other side shows recipient photo (or initial), own side shows user photo (or initial) instead of 👤 emoji
  - props: userPhoto, defaultAvatar
- UserProfile (src/pages/UserProfile.tsx): preset avatar grid updated to .png paths.
- App.tsx: AIChat gets userName/userPhoto/defaultAvatar; MessageInbox gets userPhoto/defaultAvatar.
- App.tsx line ~1563 (AIChat), ~1586 (MessageInbox) edits done.

## Still to do
1. Build succeeds? Verify with npx vite build.
2. Commit + push to main -> GitHub Pages auto-deploy.
3. Deliver PNG avatars + summary to user.

## User request (Arabic)
Replace avatars entirely with newly generated ones, and show each user's avatar in Cosmo chat (AIChat) and class/direct chats (MessageInbox).
