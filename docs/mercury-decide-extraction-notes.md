# Mercury Decide extraction notes

Mercury Decide is a structured decision model, not a chat-completions text generator. The official Decisions API is `POST https://api.inceptionlabs.ai/v1/decisions` with model `mercury-decide`, a shared `state`, and typed `questions`. Its `extract` question returns exact spans with text, offsets, and confidence.

The official Extract documentation states that an extract request can contain up to 26 criteria fields and has a request limit of 32,768 tokens. QuizSpace therefore uses a conservative 100,000-character chunk budget for large documents and feeds returned spans into the existing strict literal parser. If Mercury is unavailable or returns no usable spans, the local parser and existing OpenRouter extraction fallback remain available.

Sources:
- https://docs.inceptionlabs.ai/capabilities/decisions
- https://docs.inceptionlabs.ai/capabilities/extract
- https://openrouter.ai/inception/mercury-decide:free
