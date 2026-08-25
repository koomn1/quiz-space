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
    expect(source).toContain("currentPage: 'quiz-creator-post-extraction-solving'");
    expect(source).toContain('const overlayProgress = isProcessingOcr ? ocrProgress : generationProgress;');
    expect(source).toContain('const maxConcurrentBatches = 3;');
    expect(source).toContain('const unresolvedObjectiveCount = solvedQuestions.filter(question =>');
    expect(source).toContain('اكتملت الإجابات الموجودة في الاستخراج، دون استدعاء مزود خارجي إضافي.');
    expect(source).toContain('const answerKeyMarker =');
    expect(source).toContain(': { ...requestOptions, attachment };');
    expect(source).toContain('const isPdfAttachment = attachment.kind === \'file\' && attachment.mimeType === \'application/pdf\';');
    expect(source).toContain('const primaryRequestOptions = isPdfAttachment || sourceContext');
    expect(source).toContain('response = await askAI(prompt, primaryRequestOptions);');
    expect(source).toContain('PDF answer-review request failed; retrying the same batch with the PDF attachment.');
    expect(source).toContain('استخدم مرفق PDF الآن فقط للتحقق البصري عند الحاجة');
    expect(source).toContain('applyVerifiedAnswerReviews(batch.questions, response.text)');
    expect(source).toContain('const saved = await handlePublishQuiz(solvedQuestions');
    expect(source).toContain("correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : -1");
    expect(source).toContain("setActiveMode('ocr');");
    expect(source).toContain('An extracted quiz must not leak into the ordinary draft channel');
    expect(source).toContain('question?.type === \'essay\'');
  });
});
