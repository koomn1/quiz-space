# QuizSpace media root-cause findings

Date: 2026-08-25

## Confirmed causes

1. `QuizCreator.tsx` stores manually attached question images as full `data:` URLs in `Question.imageUrl`. The same raw string is persisted unchanged through `useQuizGenerator.ts` and `db.ts` into the `quizzes.questions` JSON value. This creates oversized quiz rows, unstable persistence, and no durable MIME/asset metadata.

2. `QuizCreator.tsx` contains `splitImageIntoParts()`, which loads an image into a Canvas and re-encodes slices with `canvas.toDataURL(file.type)`. Canvas cannot preserve animated GIF frames; this path flattens animation and may produce invalid/poor output for unsupported encodings.

3. The extraction Worker allowlist currently accepts JPEG, PNG, and WebP but rejects `image/gif`. The Worker sends image input to the model, then returns only normalized question JSON. It does not preserve source images or create durable question-media assets. The temporary source upload is deleted after extraction.

4. The quiz editor and resolver render raw `imageUrl` values with plain `<img>` tags. The editor clears `question.imageUrl` on `onError`, hiding the actual failure from the user instead of preserving/retrying the media.

5. The Service Worker does not intercept question images or Supabase Storage URLs, so it is not the primary cause of this defect.

## Deployment status

The previous nested answer-review parser commit `fb5938f` is deployed successfully by GitHub Actions run `32888051384`. This does not prove the full 90-question flow is verified after deployment.

## Intended repair direction

Introduce a shared media normalization/upload boundary before quiz save: preserve original GIF bytes and MIME, upload question assets to an authorized durable storage location, persist a stable asset reference instead of large data URLs, and render media through a shared resilient component with loading/error states. Keep source-document extraction fast and keep media preservation separate from AI text/answer solving.
