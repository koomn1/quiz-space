# Nemotron question extraction notes

## Implemented pipeline

- Added a shared `worker/src/documentExtraction.ts` module that extracts questions from text with `nvidia/nemotron-3.5-lightning:free` first, then `openai/gpt-oss-20b:free`, then `qwen/qwen3-235b-a22b:free`.
- The request uses `temperature: 0.1` and `max_tokens: 16_000`, and requires JSON-only output while preserving the source language, question text, options, numbering, question type, and explicitly stated answer.
- Responses are parsed from either a JSON array or the existing QuizSpace `{ questions: [...] }` shape, validated, normalized to the QuizSpace `mcq`/`tf`/`essay` schema, and de-duplicated by normalized question text. Unknown answers remain `correctIndex: -1` and an empty `correctAnswer`; the model is never asked to guess.
- Text documents up to 500,000 characters use one model request. Larger documents are split only when necessary, with two bounded requests in parallel and ordered de-duplication.

## File handling

- Text-based PDFs are parsed with `unpdf` before the model call. If the extracted text is empty or the text-only route cannot produce valid questions, the existing OpenRouter PDF vision/OCR fallback remains available for scanned PDFs.
- DOCX and XLSX files now reuse their extracted text through the same Nemotron pipeline instead of making many 10,000-character requests.
- The streaming PDF endpoint uses the same fast path and emits `init`, `progress`, and `complete` SSE events compatible with the existing QuizCreator UI.

## Verification

- Frontend `npm run typecheck` passed.
- Frontend `npm run build` passed; Vite only reports the existing large-chunk warning.
- Worker `npx tsc --noEmit` passed.
- Wrangler worker dry-run passed with a 4.996 MB upload and 1.134 MB gzip size.
- A local PDF fixture verified that `unpdf` extracts embedded text correctly.
- The updated UI progress messages now describe the Nemotron text-extraction path.

## Deployment test pending

The production worker and GitHub Pages build must be deployed from `main`, followed by a small TXT/PDF upload in QuizCreator to verify the live model response and Supabase quiz persistence. Scanned PDFs should be tested separately to confirm the vision fallback.
