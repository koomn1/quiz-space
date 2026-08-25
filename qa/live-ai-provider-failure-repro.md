# AI provider failure reproduction

On 2026-08-25, the deployed `https://quiz-space-app.pages.dev/#/dashboard/create` route was tested with the local `qa/90-mcq-verification.pdf` file. The file contains 90 MCQ questions followed by an explicit `Answer key` using entries such as `1: B`, `2: C`, and `90: C`.

The deployed UI entered the explicit three-step sequence `استخراج → حل الاختبار بعد الاستخراج → حفظ بعد التحقق`. An older locally persisted draft from the same file contained 96 extracted questions and displayed `لم يتم التحقق من إجابات 90 سؤالًا`, confirming the previous run failed during the post-extraction solve stage rather than during display of the saved quiz.

The worker currently routes `quiz-creator-post-extraction-solving` requests with a PDF attachment to three OpenRouter vision models and gives each model a 25-second timeout. If every model fails, the route returns the generic 502 message `AI provider request failed. Please retry shortly.` The client then surfaces that message in QuizCreator and keeps the extraction panel open.

The source-answer-key parser is correct for the test format, but it only helps when the browser can extract at least 500 characters locally from the PDF. Scanned or otherwise unreadable PDFs still reach the attachment/vision path and can fail when the provider rejects the PDF or the 25-second model window expires.
