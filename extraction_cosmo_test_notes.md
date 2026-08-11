## Extraction and Cosmo Chat verification

- The original file flow encoded the complete selected file in `QuizCreator` and then read `sourceFile` a second time inside `useQuizGenerator`; the hook now reuses the already-created Base64 and only falls back to `FileReader` when no `fileUri` is supplied.
- PDF extraction now uses five pages per chunk and a bounded concurrency of three in both the streaming and fallback worker paths. Results remain appended in batch order, while progress is emitted per completed chunk.
- Word, Excel, and text extraction now uses bounded groups of four text chunks instead of an unbounded `Promise.all`, preventing rate-limit retries from delaying large documents.
- The selected Literal/Generate extraction mode is now passed through the streaming client instead of being forced to Literal.
- Cosmo Chat suggestions now run in the background after the streamed answer is committed, so the main response does not remain in a loading state while the optional suggestions are generated.
- Production deployment for commit `9098c57` succeeded: Frontend build, GitHub Pages deployment, and AI Worker deployment all passed.
- Published Cosmo Chat test: sent `اشرح قانون نيوتن الثاني في سطرين`; the streamed Arabic answer arrived successfully, finalized in the conversation, and the browser console showed no errors. The final response included `F = m × a` and the optional-suggestions area remained available.
