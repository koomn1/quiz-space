# Quiz Space AI Worker

This worker keeps provider keys off GitHub Pages. It accepts only authenticated Supabase users.

1. Run `pnpm install` from the repository root (the repository uses pnpm lockfiles).
2. Set `INCEPTION_API_KEY`, `XKIRO_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `ALLOWED_ORIGIN` (for example, `https://quiz-space-app.pages.dev`) as Wrangler secrets. Inception Mercury 3 handles text generation, while xKiro uses `cohere/command-a-plus` for images and scanned PDF pages.
3. Run `npm run deploy` and copy the Worker URL into the GitHub repository secret `VITE_AI_WORKER_URL`.

Do not create `VITE_*_API_KEY` secrets. Vite embeds every `VITE_*` value into the public browser bundle.
