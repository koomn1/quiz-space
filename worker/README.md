# Quiz Space AI Worker

This worker keeps provider keys off GitHub Pages. It accepts only authenticated Supabase users.

1. Run `cd worker && npm install`.
2. Set `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `ALLOWED_ORIGIN` (for example, `https://quiz-space-app.pages.dev`) as Wrangler secrets. Groq's `openai/gpt-oss-20b` is the fast, low-cost primary text model; OpenRouter remains the fallback and handles multimodal document requests.
3. Run `npm run deploy` and copy the Worker URL into the GitHub repository secret `VITE_AI_WORKER_URL`.

Do not create `VITE_*_API_KEY` secrets. Vite embeds every `VITE_*` value into the public browser bundle.
