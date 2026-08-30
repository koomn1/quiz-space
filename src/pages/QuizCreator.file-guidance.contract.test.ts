import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/pages/QuizCreator.tsx'), 'utf8');

describe('QuizCreator file guidance contract', () => {
  it('sends the selected file through the existing guided AI stream', () => {
    expect(source).toContain('const handleGuideFile = async () => {');
    expect(source).toContain('const attachment: AiChatAttachment = {');
    expect(source).toContain('await askAIStream(');
    expect(source).toContain("currentPage: 'quiz-creator-file-guidance'");
  });

  it('keeps extraction separate and explains Office-file support honestly', () => {
    expect(source).toContain('handleProcessDocument');
    expect(source).toContain('ملف Office سيُعالج مباشرة من مسار الاستخراج');
    expect(source).toContain('percentage: generationProgress.percentage');
  });

  it('offers owner-scoped continuation after leaving an extracted quiz', () => {
    expect(source).toContain('getQuizCreatorDraftOwnerId(userId, lang)');
    expect(source).toContain('saveExtractedQuizDraft({');
    expect(source).toContain('loadExtractedQuizDraft(draftOwnerId)');
    expect(source).toContain('هل تريد استكمال هذا الاختبار؟');
    expect(source).toContain('نعم، استكمال الاختبار');
    expect(source).toContain('لا، مسح كل الأسئلة');
    expect(source).toContain('clearExtractedQuizDraft(draftOwnerId);');
    expect(source).toContain('localStorage.removeItem(getQuizCreatorDraftKey(draftOwnerId));');
  });

  it('runs a distinct post-extraction solve stage before final persistence', () => {
    expect(source).toContain('const solveExtractedQuiz = async');
    expect(source).toContain('const prepareAndSolveExtractedQuiz = async');
    expect(source).toContain('persist: false');
    expect(source).toContain('await prepareAndSolveExtractedQuiz(result);');
    expect(source).toContain('حل الاختبار بعد الاستخراج');
    expect(source).toContain("currentPage: 'quiz-creator-solving'");
    expect(source).toContain('const overlayProgress = isProcessingOcr ? ocrProgress : generationProgress;');
    expect(source).toContain('const batchSize = 6;');
    expect(source).toContain('const maxConcurrentBatches = 5;');
    expect(source).toContain('const maxSolveAttempts = 2;');
    expect(source).toContain('const recoverFailedBatches = async');
    expect(source).toContain('Promise.allSettled(group.map(item => solveBatch({ offset: item.offset, questions: [item.question] })))');
    expect(source).toContain('const unresolvedObjectiveCount = getInvalidQuizQuestions(solvedQuestions).length;');
    expect(source).toContain('اكتملت الإجابات الموجودة في الاستخراج، دون استدعاء مزود خارجي إضافي.');
    expect(source).toContain('const answerKeyMarker =');
    expect(source).toContain(': { ...requestOptions, attachment };');
    expect(source).toContain('const isPdfAttachment = attachment.kind === \'file\' && attachment.mimeType === \'application/pdf\';');
    expect(source).toContain('const primaryRequestOptions = isPdfAttachment || sourceContext');
    expect(source).toContain('response = await askAI(`${prompt}\\n\\nمحاولة التحقق رقم ${attempt} من ${maxSolveAttempts}.`, primaryRequestOptions)');
    expect(source).toContain('PDF answer-review request failed; retrying the same batch with the PDF attachment.');
    expect(source).toContain("if (!isPdfAttachment || sourceContext) throw error;");
    expect(source).toContain('استخدم مرفق PDF الآن فقط للتحقق البصري عند الحاجة');
    expect(source).toContain('normalizeSingleQuestionReviewResponse(response.text, batch.offset, batch.questions[0]?.number)');
    expect(source).toContain('applyVerifiedAnswerReviews(batch.questions, normalizedResponse, { allowPartial: true })');
    expect(source).toContain('أعد JSON مختصرًا فقط بهذا الشكل: {"answers":[{"questionIndex":1,"correctIndex":0,"explanation":"سبب علمي مختصر يثبت لماذا هذا الاختيار صحيح."}]}');
    expect(source).toContain('أضف explanation قصيرًا لكل سؤال موضوعي، بحد أقصى 240 حرفًا');
    expect(source).toContain('شرحًا إنشائيًا غير مستند');
    expect(source).toContain('تم تثبيت هذا الاختيار وفق مفتاح الإجابة المرفق في الملف.');
    expect(source).toContain('This choice was verified against the answer key included in the file.');
    expect(source).toContain('const saved = await handlePublishQuiz(solvedQuestions');
    expect(source).toContain("correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : -1");
    expect(source).toContain('const unresolvedQuestions = getInvalidQuizQuestions(sanitizedQuestions);');
    expect(source).toContain('const preservedQuestions = lastSolvedQuestionsRef.current.length > 0 ? lastSolvedQuestionsRef.current : draftQuestions;');
    expect(source).toContain('const hasValidAnswer = getInvalidQuizQuestions([question]).length === 0;');
    expect(source).toContain('const isComplete = hasText && hasValidAnswer;');
    expect(source).toContain('const handleConfirmManualAnswersAndSave = async () => {');
    expect(source).toContain('اعتماد الإجابات اليدوية وحفظ الاختبار');
    expect(source).toContain('disabled={isManuallyConfirmingAnswers || isSaving || getInvalidQuizQuestions(questions).length > 0}');
    expect(source).toContain('const incompleteQuestions = getInvalidQuizQuestions(questions);');
    expect(source).toContain('عرض الأسئلة غير المكتملة');
    expect(source).toContain('scrollToIncompleteQuestion');
    expect(source).toContain('id={`quiz-question-${qIdx}`}');
    expect(source).toContain("setActiveMode('ocr');");
    expect(source).toContain("setManualSolveOnlyNotice");
    expect(source).toContain('تم تجاوز مرحلة الحل تلقائيًا');
    expect(source).toContain('هذا الـquiz غير مسموح حله آليًا');
    expect(source).toContain('setPostExtractionSolvePending(false);');
    expect(source).toContain("setActiveMode('manual');");
    expect(source).toContain('Never leave the user trapped in the solving stage');
    expect(source).toContain('An extracted quiz must not leak into the ordinary draft channel');
    expect(source).toContain('question?.type === \'essay\'');
    expect(source).toContain('مصدر الاختبار الجاري');
    expect(source).toContain('الموضوع المستخلص:');
    expect(source).toContain('fileUploadName,');
  });
});
