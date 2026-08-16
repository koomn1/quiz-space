import { describe, expect, it } from 'vitest';
import type { Quiz } from '../types';
import { createQuizPdfBytes } from './quizPdf';

const textOnlyQuiz: Quiz = {
  id: 'pdf-size-fixture',
  title: 'اختبار نصي تجريبي — Arabic and English',
  description: 'هذا اختبار نصي للتحقق من أن الأسئلة العربية والإنجليزية تبقى قابلة للبحث داخل ملف PDF صغير.',
  creatorId: 'fixture',
  creatorName: 'Quiz Space',
  questions: Array.from({ length: 36 }, (_, index) => ({
    id: `question-${index + 1}`,
    type: index % 5 === 0 ? 'essay' : index % 3 === 0 ? 'tf' : 'mcq',
    text: index % 2 === 0
      ? `ما العلاقة بين التعلّم والممارسة؟ Explain the learning relationship clearly.`
      : `Question ${index + 1}: اختر الإجابة الصحيحة حول مهارات التفكير والتحليل في Quiz Space.`,
    options: index % 5 === 0 ? [] : index % 3 === 0
      ? ['صح', 'خطأ']
      : ['الإجابة الأولى', 'الإجابة الثانية', 'الإجابة الثالثة', 'الإجابة الرابعة'],
    correctIndex: 0,
  })),
  createdAt: new Date(0).toISOString(),
  totalPlays: 0,
  avgRating: 0,
  ratingsCount: 0,
};

describe('vector quiz PDF export', () => {
  it('creates a valid text-first PDF under 5MB for a text-only quiz', async () => {
    const bytes = await createQuizPdfBytes(textOnlyQuiz);
    const header = new TextDecoder().decode(bytes.slice(0, 5));

    expect(header).toBe('%PDF-');
    expect(bytes.byteLength).toBeLessThan(5 * 1024 * 1024);
  });
});
