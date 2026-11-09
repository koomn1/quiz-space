import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/QuizResolver.tsx'), 'utf8');
const statusComponent = readFileSync(resolve(process.cwd(), 'src/components/EssayGradingStatus.tsx'), 'utf8');
const clientSource = readFileSync(resolve(process.cwd(), 'src/services/aiWorkerClient.ts'), 'utf8');
const creatorSource = readFileSync(resolve(process.cwd(), 'src/pages/QuizCreator.tsx'), 'utf8');
const gradeFunction = source.slice(source.indexOf('const gradeEssayAnswer'), source.indexOf('// Load signed-in ratings'));
const gradeFailureHandler = gradeFunction.slice(gradeFunction.indexOf('} catch (error)'), gradeFunction.indexOf('} finally'));

describe('AI essay grading mode contract', () => {
  it('keeps manual review separate and does not call AI unless the quiz is explicitly in AI mode', () => {
    expect(gradeFunction).toContain("if (quiz?.essayGradingMode !== 'ai')");
    expect(gradeFunction).toContain('return;');
    expect(creatorSource).toContain("onClick={() => setEssayGradingMode('manual')}");
    expect(creatorSource).toContain("onClick={() => setEssayGradingMode('ai')}");
  });

  it('starts AI grading automatically when the student submits an essay answer', () => {
    expect(source).toContain('void gradeEssayAnswer(currentIdx, currentQuestion, essayAnswerText.trim())');
    expect(statusComponent).toContain("isArabic ? 'جارٍ تصحيح الإجابة المقالية بالذكاء الاصطناعي...' : 'AI is grading your essay...'");
    expect(source).toContain("جارٍ تصحيح الإجابة بالذكاء الاصطناعي...");
    expect(source).toContain("essayGradingErrors[currentIdx]");
  });

  it('counts the submitted current question in progress and caps progress at 100%', () => {
    expect(source).toContain('const answeredQuestionCount = currentIdx + (isAnswersFrozen ? 1 : 0);');
    expect(source).toContain('Math.min(100, Math.round((answeredQuestionCount / quiz.questions.length) * 100))');
  });

  it('automatically retries transient service errors without exposing a retry button', () => {
    expect(clientSource).toContain('const retryDelays = [1_000, 2_500]');
    expect(clientSource).toContain('const retryable = status === 0 || [408, 429, 502, 503, 504].includes(status)');
    expect(statusComponent).not.toContain('<button');
    expect(gradeFailureHandler).not.toContain('setEssayAssessments');
    expect(gradeFailureHandler).toContain('Automatic grading could not finish. Your answer was not marked wrong.');
  });

  it('lets Cosmo assess an essay even when the author did not provide a model answer', () => {
    expect(source).toContain('سيقيّم كوزمو إجابتك اعتمادًا على نص السؤال');
  });
});
