# Production regression notes

The GitHub Actions run `31534150412` for commit `0aac1a4` completed successfully. The frontend build, GitHub Pages deployment, and AI Worker deployment all passed. GitHub reported only the existing Node.js 20 deprecation annotation for action metadata.

The published app at `https://koomn1.github.io/quiz-space/` opened in the persisted user session as Youssef Badawy. The onboarding/migration screen completed and the home dashboard loaded. The dashboard rendered the compressed Motivation Hub assets, including the Lucky Wheel, streak, mystery box, brain challenge, referral, weekly achievement, happy hour, group challenge, leaderboard, and AI quiz cards. The visible interface was readable in the current light appearance.

Cosmo Chat loaded an existing Arabic conversation titled `اشرح قانون نيوتن الثاني في سطرين`. The saved response was visible, included `F = m × a`, and the optional suggestions area was present, confirming that the non-blocking response/suggestions flow did not block the page.

The homepage navigation menu successfully opened. The first attempted click on the classroom item used a stale element index and navigated to Cosmo Chat instead; this is a browser snapshot/indexing issue, not a confirmed application defect. The next test will reopen the menu from the current page and use a fresh snapshot/DOM mapping to select `الفصول الدراسية`.

## Newly reproduced regression

On 2026-08-11, the live classroom creation form accepted the test name `اختبار Nemotron Regression` but failed on submit with the exact database error: `null value in column "code" of relation "classrooms" violates not-null constraint`. The existing classroom `عنبه • V77ZT0` remained visible, so no new test classroom was created. This is a confirmed production defect in the classroom creation insert payload or database default, and it must be fixed before final verification.

## Classroom code fix deployment

The confirmed fix adds a six-character, uppercase classroom code generated in the browser and sends it explicitly in the Supabase insert. Frontend typecheck and build passed. Commit `0bc4355` was pushed, and GitHub Actions run `31534998717` completed successfully for Build Frontend, Deploy GitHub Pages, and Deploy AI Worker. A cache-busted production reload was then started to avoid reusing the old JavaScript bundle; the app returned to its onboarding/migration screen as expected.

## Classroom creation retest passed

After a cache-busted reload of the deployed `0bc4355` build, creating `اختبار Nemotron Regression 2` succeeded. The UI showed `تم إنشاء فصلك الدراسي الفخم بنجاح!`, generated code `P5VS63`, added the classroom to the active list, and opened its workspace with the expected overview counters and management tabs. This confirms the `code` not-null regression is fixed in production.

The next live check is the lesson/online-class creation flow inside this newly created classroom.

## Lesson creation regression reproduced

Inside the newly created classroom `اختبار Nemotron Regression 2` (`P5VS63`), the `الحصص أونلاين` tab opened correctly and the add-lesson form accepted a valid YouTube URL, title, and description. Submitting `حفظ الحصة` still showed `خطأ — فشل إضافة الحصة`, and no lesson appeared. This confirms the remaining defect is in the `addLessonVideo` data path or its RLS/schema contract rather than in the classroom workspace UI.

## Lesson creation fix passed

Supabase API logs showed the original lesson insert returning `POST | 403` for `classroom_lesson_videos`. Direct privilege inspection confirmed both `anon` and `authenticated` had no table privileges. The applied migration grants authenticated CRUD access, enables RLS, and restricts reads to classroom owners/members while restricting writes, updates, and deletes to the classroom owner.

After applying the migration, resubmitting the same lesson succeeded. The UI displayed `تمت الإضافة — الحصة تمت إضافتها بنجاح`, closed the form, generated the YouTube thumbnail, and displayed `حصة اختبار الإصلاح` with its description and delete action. This confirms the previously reported `Failed to add lesson` issue is fixed in production.

## Quiz Creator regression test started

The production classroom workspace now contains the successful lesson and its YouTube thumbnail. The navigation menu opened from the workspace, and `إنشاء اختبار` loaded the Quiz Creator page in the new published bundle. The initial mode is `كتابة يدوية`; the next step is to switch to the file-extraction mode and upload controlled TXT/PDF/DOCX fixtures.

## File upload fixture setup

The Quiz Creator file mode `صورة أو PDF` loaded successfully. Its DOM contains one hidden file input with `accept="image/*, application/pdf"` and id `document-upload-input`, so the controlled PDF fixture can be uploaded directly without using the manual-question path. TXT and DOCX fixtures are also ready locally for the text/document extraction routes.

## Upload harness note

The PDF extraction screen rendered correctly, but the automated upload helper could not target the hidden `document-upload-input` by the visible element index (`index 0` could not locate it; the label index is not a file input). This is a test-harness limitation, not an application failure. The next attempt will temporarily expose the existing file input through the page DOM, then use the browser upload action against the actual input element.

## Text PDF upload passed

The hidden input was exposed only for test harness purposes and the controlled `nemotron_fixture.pdf` uploaded successfully. Quiz Creator displayed the file name and exposed the extraction controls; `استخراج حرفي فائق الأمانة` was selected, and the configured question-count controls plus the final processing button appeared. The next action will start the live worker request and verify that the resulting draft contains the two fixture questions without blocking or a false failure.

## PDF extraction currently pending

The live PDF request started and the UI correctly switched to `جاري صياغة الأسئلة...` with the Nemotron-specific progress message. Two status checks over the next interval still showed `0 / 100 سؤال` and the disabled processing state. No visible error appeared. The fixture contains only two questions, so the displayed 100-question target is noteworthy and will be investigated if the request does not complete shortly.

A further status check still showed the PDF extraction at `0 / 100` with no UI error. The browser console contained no application exception beyond the temporary test-harness DOM exposure. The next diagnostic is to inspect the worker request resources and server-side logs before deciding whether the live pipeline or only the UI progress target is at fault.

## Extraction diagnosis

Code inspection shows `worker/src/streaming.ts` sends the SSE `init` event only after `extractPdfTextContent()` **and** `extractQuestionsFromText()` finish. Therefore the browser remains at its initial `0 / 100` state while the Nemotron request is in flight. The live request has now remained in that state for more than two minutes, which is not acceptable for the 178-byte fixture. The browser-console isolation request could not reuse the upload because React had replaced the file input and its `files` collection was empty. This points to a worker/model timeout or stalled streaming response, with a secondary UX issue that init is emitted too late.

## Production extraction fix passed

Commit `7dab5d1` was deployed successfully by GitHub Actions run `31536757372`; Build Frontend, Deploy AI Worker, and Deploy GitHub Pages all completed successfully. The new production bundle was loaded with cache-bust `v=7dab5d1`. After synchronization, Quiz Creator opened in manual mode with an automatically populated draft containing exactly **2 questions** from `nemotron_fixture.pdf`: the multiple-choice `What is 2 + 2?` with four options and the true/false water-freezing question. Both were marked `جاهز ومكتمل`, confirming that the previous 0/100 stall and empty extraction are resolved for a text-based PDF.

## Scanned-PDF fallback test setup

After the text-PDF pass, the published Quiz Creator switched back to `صورة أو PDF` successfully. A separate one-page image-only PDF was generated locally with the same two questions and no selectable text layer; it is ready to verify the vision/OCR fallback without changing the source code.

The image-only PDF uploaded successfully in the published bundle and is displayed as `quizspace_scanned_fixture.pdf` with the same extraction controls. The first upload attempt from `/tmp` was rejected by the browser harness path policy, then the identical file was copied to the project test directory and uploaded successfully; this was not an application error.

## Scanned fallback diagnosis

The scanned-PDF request reached `جاري معالجة 1 صفحة في 1 مجموعة` but remained at `0 / 1` on the current production bundle. Code review showed the vision fallback had no per-model timeout and accepted empty model content as a successful response. A follow-up source fix now adds a 20-second abort per vision provider and rejects empty responses so the fallback chain can continue and the UI can receive a deterministic error rather than hang indefinitely.

## Vision-timeout deployment

Commit `8ca30fd` was deployed successfully by GitHub Actions run `31537370566`; all three jobs passed. The cache-busted bundle loaded and account synchronization restored the previous two-question draft with explanations, confirming persistence of the successful text-PDF extraction across reloads. The scanned-PDF test must be re-entered after dismissing the synchronization overlay so that the new worker timeout can be observed independently.

The synchronization overlay disappeared on its own; the stale `تخطي` click was harmless and did not alter the app. A fresh snapshot confirms the two-question extracted draft remains intact after the second deployment. The scanned fallback will now be re-run from a clean mode switch on this bundle.

The clean post-deployment re-entry into the `صورة أو PDF` mode succeeded on `v=8ca30fd`; the mode selector and upload drop zone are available again. The scanned fixture will now be uploaded and processed once more to measure the timeout-safe fallback.

## Scanned-PDF fallback passed

On the redeployed bundle `v=8ca30fd`, the image-only PDF entered `جاري معالجة 1 صفحة في 1 مجموعة` at `0 / 1`, then completed after the provider fallback window. Quiz Creator returned to the manual editor with exactly **2 complete questions**, including the multiple-choice arithmetic question and the true/false water-freezing question, both marked `جاهز ومكتمل` with explanations. This confirms the scanned/image-only PDF path works after the timeout-safe vision fallback; it is slower than text PDFs but no longer hangs indefinitely.
