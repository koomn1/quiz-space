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
});
