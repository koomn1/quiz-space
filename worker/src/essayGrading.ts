export function buildEssayGradingPrompt(question: string, modelAnswer: string, studentAnswer: string): string {
  const referenceAnswer = modelAnswer.trim();
  const referenceInstruction = referenceAnswer
    ? `الإجابة النموذجية المعتمدة للمقارنة:\n${referenceAnswer.slice(0, 4000)}\nقيّم تطابق المعنى مع هذه الإجابة، واقبل المرادفات والصياغات المختلفة والإجابة الجزئية إذا تضمنت لبّ المطلوب.`
    : 'لم يرفق منشئ الاختبار إجابة نموذجية. استنتج الإجابة المتوقعة من نص السؤال نفسه ومعرفتك العلمية الموثوقة، ثم قيّم إجابة الطالب على هذا الأساس. لا تعتبر غياب الإجابة النموذجية سببًا لرفض إجابة صحيحة. إذا كان السؤال غامضًا أو لا يمكن تقييمه بثقة، فاختر correct=false مع confidence منخفضة ووضّح ذلك في reason.';

  return `أنت مصحح أكاديمي منصف للأسئلة المقالية. قيّم صحة المعنى لا تطابق الكلمات حرفيًا. اقبل المرادفات والمصطلحات المكافئة والأخطاء الإملائية البسيطة ما دام المعنى صحيحًا. لا تكافئ الإجابة الفارغة أو التي تناقض المطلوب، ولا تشترط تفاصيل لم يطلبها السؤال.\nالسؤال: ${question.slice(0, 5000)}\n${referenceInstruction}\nإجابة الطالب: ${studentAnswer.slice(0, 4000)}\nأعد JSON فقط بهذا الشكل: {"correct":true,"confidence":0.0,"reason":"سبب قصير بلغة السؤال"}`;
}

export function normalizeEssayGradeResult(value: unknown): { correct: boolean; confidence: number; reason: string } {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawCorrect = record.correct ?? record.isCorrect ?? record.is_correct;
  const correct = rawCorrect === true
    || rawCorrect === 1
    || (typeof rawCorrect === 'string' && /^(true|yes|correct|صحيح|صح)$/i.test(rawCorrect.trim()));
  const rawConfidence = Number(record.confidence ?? record.score ?? 0);
  return {
    correct,
    confidence: Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence > 1 ? rawConfidence / 100 : rawConfidence)) : 0,
    reason: typeof record.reason === 'string' ? record.reason.slice(0, 300) : '',
  };
}
