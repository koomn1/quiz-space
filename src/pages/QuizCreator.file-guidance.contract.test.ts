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

  it('runs a distinct post-extraction solve stage before final persistence', () => {
    expect(source).toContain('const solveExtractedQuiz = async');
    expect(source).toContain('const prepareAndSolveExtractedQuiz = async');
    expect(source).toContain('persist: false');
    expect(source).toContain('await prepareAndSolveExtractedQuiz(result);');
    expect(source).toContain('حل الاختبار بعد الاستخراج');
    expect(source).toContain("currentPage: 'quiz-creator-post-extraction-solving'");
    expect(source).toContain('attachment: attachment || undefined');
    expect(source).toContain('applyVerifiedAnswerReviews(batch, text)');
    expect(source).toContain('const saved = await handlePublishQuiz(solvedQuestions');
    expect(source).toContain('correctIndex: typeof q.correctIndex === \'number\' ? q.correctIndex : -1');
  });
});
