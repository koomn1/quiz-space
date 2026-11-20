import type { AllowedQuestionType, ExtractionJobRow } from './types';

export function detectSourceLanguage(text: string): 'ar' | 'en' | 'unknown' {
  const sample = String(text || '').slice(0, 120_000);
  const arabic = (sample.match(/[\u0600-\u06ff]/g) || []).length;
  const latin = (sample.match(/[A-Za-z]/g) || []).length;
  if (arabic >= 8 && arabic >= latin * 0.2) return 'ar';
  if (latin >= 8 && latin >= arabic * 0.2) return 'en';
  return 'unknown';
}

export function sourceLanguageInstruction(text = ''): string {
  const language = detectSourceLanguage(text);
  if (language === 'ar') return 'اكتب العنوان والوصف وجميع الأسئلة والخيارات والإجابات والشروح بالعربية، بنفس لغة المصدر. لا تترجم المحتوى إلى الإنجليزية.';
  if (language === 'en') return 'Write the title, description, questions, options, answers, and explanations in English, matching the source language. Do not translate the content into Arabic.';
  return 'Detect the dominant language of the source and write the entire quiz in that same language. Do not translate it into another language.';
}

/**
 * A question bank must not be treated like ordinary lecture notes. The
 * uploaded source can contain hundreds of numbered MCQs followed by a
 * separately numbered essay section, so the automatic Generate path needs to
 * preserve the source question count instead of using a small content-density
 * heuristic. Literal extraction does not call this helper and remains
 * unchanged.
 */
export function detectQuestionBank(sourceText = ''): { isQuestionBank: boolean; numberedQuestions: number } {
  const text = String(sourceText || '');
  // PDF text extraction may collapse the original indentation to one space;
  // require visible content after the number so page counters are ignored.
  const numberedLines = [...text.matchAll(/^\s*(\d{1,3})\s+(?=\S)/gm)]
    .map(match => Number(match[1]))
    .filter(number => Number.isInteger(number) && number > 0);
  const shortAnswerLines = [...text.matchAll(/^\s*(\d{1,3})[-.)]\s+/gm)]
    .map(match => Number(match[1]))
    .filter(number => Number.isInteger(number) && number > 0);
  const highestNumber = Math.max(0, ...numberedLines, ...shortAnswerLines);
  const numberedQuestionSignals = new Set([...numberedLines, ...shortAnswerLines]).size;
  const isQuestionBank = numberedQuestionSignals >= 20 || highestNumber >= 50;
  // MCQ banks commonly restart numbering in a later essay/short-answer
  // section. The highest MCQ number plus the separately numbered short-answer
  // lines therefore gives a better automatic target than a Set of numbers
  // (which would collapse both sections into the same 1..16 range).
  const mcqCount = Math.max(0, ...numberedLines);
  const estimatedQuestionCount = Math.max(mcqCount + shortAnswerLines.length, numberedQuestionSignals);
  return { isQuestionBank, numberedQuestions: isQuestionBank ? estimatedQuestionCount : 0 };
}

export function parseAllowedQuestionTypes(customInstruction?: string | null): AllowedQuestionType[] {
  const marker = String(customInstruction || '').match(/\[QUESTION_TYPES_ALLOWED:\s*([^\]]+)\]/i);
  if (!marker) return ['mcq', 'tf', 'essay'];
  const allowed = marker[1].split(/[,+\s]+/).filter((type): type is AllowedQuestionType => type === 'mcq' || type === 'tf' || type === 'essay');
  return allowed.length ? [...new Set(allowed)] : ['mcq', 'tf', 'essay'];
}

export function allowedQuestionTypesInstruction(customInstruction?: string | null): string {
  const allowed = parseAllowedQuestionTypes(customInstruction);
  const labels = allowed.map(type => type === 'mcq' ? 'multiple choice (mcq)' : type === 'tf' ? 'true/false (tf)' : 'written/essay (essay)');
  return `Allowed output types are ONLY: ${labels.join(', ')}. Never return a question whose type is not in this list. If generating questions, convert every requested question to one of these types.`;
}

export function extractionPrompt(customInstruction?: string | null, sourceText = ''): string {
  return `You are a lossless document extraction engine.
${sourceLanguageInstruction(sourceText)}
${allowedQuestionTypesInstruction(customInstruction)}
Extract EVERY question exactly as written.

Rules:
- Do not summarize or rewrite.
- Do not skip any question, including multiple choice, true/false, and essay/short answer questions.
- Preserve numbering and options (A/B/C/D) exactly.
- If a question starts on one page and continues on the next, merge it into one complete question.
- For Essay/Short answer questions, use type "essay" and leave options as an empty array [].
- For MCQ and true/false questions, set correctIndex only when the source explicitly provides the answer; it must point to the matching option. If the source has no answer key, use null and do not guess.
- Set correctAnswer to the exact answer text when it is explicitly available; never fabricate an answer or explanation.
- Return JSON only in the following format:
{
  "title": "Quiz Title",
  "description": "Quiz Description",
  "questions": [
    {
      "number": 1,
      "text": "Question text...",
      "type": "mcq",
      "options": ["Option 1", "Option 2"],
      "correctIndex": 0,
      "correctAnswer": "The correct answer text",
      "explanation": "Brief explanation"
    }
  ]
}
${customInstruction?.trim() ? `Additional instructions: ${customInstruction.trim().slice(0, 2000)}` : ''}`;
}

export function generatePrompt(amount: number | null | undefined, customInstruction?: string | null, sourceText = ''): string {
  const isQuestionBank = detectQuestionBank(sourceText).isQuestionBank;
  const scopeInstruction = isQuestionBank
    ? `هذا الجزء من بنك أسئلة مرقّم. استخرج كل سؤال مرقّم يظهر في هذا الجزء، مع خياراته وإجابته الموجودة في المصدر. لا تكتفِ بعدد تقريبي ولا تلخّص الأسئلة ولا تنشئ أسئلة جديدة بدل الأسئلة الموجودة. إذا انقطع السؤال بين جزأين فاستخرج الجزء الموجود هنا كاملاً واترك الدمج للمعالج.`
    : Number.isInteger(amount) && Number(amount) > 0
      ? `استخرج أو أنشئ ${amount} سؤالاً بدقة متناهية من محتوى هذا الجزء من الملف.`
      : 'افحص هذا الجزء من المستند بدقة وتعمق شديد؛ استخرج كل مفهوم أو تعريف أو معلومة أو فكرة رئيسية أو فرعية تستحق التقييم والاختبار. حدد تلقائياً عدد الأسئلة المناسب لكثافة المحتوى العلمي والمعرفي في هذا الجزء (بما يضمن التغطية الشاملة دون إهمال أي جزئية، ودون حشو سطحي أو تكرار). ركز على صياغة أسئلة احترافية تقيس الفهم والتحليل والتطبيق.';
  return `${scopeInstruction} ${sourceLanguageInstruction(sourceText)} ${allowedQuestionTypesInstruction(customInstruction)} حافظ على معلومات المستند ولا تخمّن أي معلومة غير موجودة. عند إنشاء سؤال اختيار من متعدد أو صح/خطأ، يجب أن يكون correctIndex مطابقًا لخيار موجود وأن تكون correctAnswer نص ذلك الخيار، ثم راجع كل إجابة مقابل محتوى الملف قبل الإرجاع. لا تستخدم correctIndex=-1 أو إجابة فارغة للأسئلة الموضوعية؛ إذا لم توجد إجابة موثوقة مباشرة من المحتوى، لا تغيّر النوع إلى نوع غير مسموح، بل أنشئ السؤال بأحد الأنواع المسموحة فقط. أعد JSON فقط بالشكل: {"title":"","description":"","questions":[{"number":1,"text":"","type":"mcq","options":[],"correctIndex":0,"correctAnswer":"","explanation":""}]}.${customInstruction?.trim() ? ` تعليمات إضافية: ${customInstruction.trim().slice(0, 2000)}` : ''}`;
}

export function documentVisionPrompt(job: ExtractionJobRow): string {
  if (job.extraction_mode === 'generate') {
    return `${generatePrompt(null, job.custom_instruction)}\n\nاقرأ الصفحات المرفقة بدقة وتعمق باعتبارها مادة شرح أو محتوى تعليمي، وافحص الرسوم والمخططات والمعادلات والنصوص. حدد الأسئلة بذكاء لتغطية كل النقاط الجوهرية وفق كثافة الصفحة. لا تشترط وجود أسئلة مكتوبة مسبقاً داخل الملف، ولا تقل إن الملف لا يحتوي أسئلة. IMPORTANT: detect the dominant language from the attached page itself and write the title, description, questions, options, answers, and explanations in that same language. If the page is English, every output field must be English even though these instructions contain Arabic. Do not translate. أعد JSON صالحاً فقط.`;
  }
  return `${extractionPrompt(job.custom_instruction)}\n\nIMPORTANT: The attached page image is the source of truth for language. Detect its dominant language from the page itself and return every title, question, option, answer, and explanation in that same language. Do not copy the Arabic language of these instructions into an English source. Do not translate.`;
}
