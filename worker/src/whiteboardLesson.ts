/** Prompt and request validation for AI whiteboard lessons. The client validates the model output strictly before playing it. */
export const LESSON_TOPIC_MAX = 400;

export interface LessonRequest {
  topic: string;
  lang: 'ar' | 'en';
  steps: number;
}

export function parseLessonRequest(body: any): LessonRequest | null {
  if (!body || typeof body.topic !== 'string') return null;
  const topic = body.topic.replace(/\s+/g, ' ').trim();
  if (topic.length < 3 || topic.length > LESSON_TOPIC_MAX) return null;
  const lang = body.lang === 'en' ? 'en' : 'ar';
  const steps = Number.isInteger(body.steps) ? Math.min(8, Math.max(3, body.steps)) : 5;
  return { topic, lang, steps };
}

export function buildLessonPrompt({ topic, lang, steps }: LessonRequest): string {
  const language = lang === 'ar' ? 'العربية الفصحى المبسطة' : 'clear simple English';
  const rtl = lang === 'ar'
    ? 'اللغة عربية (من اليمين لليسار): النص ذو align="start" ينتهي عند النقطة x ويمتد نحو اليسار، و align="end" يبدأ عند x ويمتد نحو اليمين، و align="center" يتمركز حول x. ضع الأشكال والأرقام على الجهة اليمنى والشروحات على يسارها.'
    : 'The language is English (left to right): align="start" begins at x and extends to the right, align="end" ends at x and extends to the left, align="center" is centred on x.';
  return `أنت معلم خبير تصمم درسًا مفصلًا يُشرح على سبورة. الموضوع: «${topic}». اكتب بـ${language} فقط. ${rtl}
أعد JSON صالحًا فقط بهذا الشكل بالضبط (بدون أي نص أو علامات markdown خارجه):
{"schema_version":1,"id":"ai-lesson","title":"عنوان قصير","lang":"${lang}","metadata":{"source":"ai","status":"draft"},"steps":[{"id":"s1","title":"عنوان الخطوة","narration":"شرح مفصل","nodes":[{"id":"n1","type":"text","x":640,"y":90,"text":"عنوان على السبورة","fontSize":48,"color":"primary","align":"center"}]}]}
قواعد المحتوى:
- عدد الخطوات ${steps} بالضبط، متسلسلة من البسيط إلى الأعمق: تمهيد، فكرة، مثال محلول خطوة بخطوة، مثال ثانٍ أو خطأ شائع، ثم خلاصة.
- narration شرح مفصل يُقرأ صوتيًا: من 5 إلى 9 جمل (حتى 600 حرف)، فيه سبب لكل فكرة ومثال رقمي أو واقعي واحد على الأقل، ويصف ما يُكتب أو يُرسم في نفس اللحظة ("نكتب"، "نرسم سهمًا").
- لا تكرر narration حرفيًا على السبورة. النص على السبورة مختصر.
- لا تخترع مراجع أو إحصاءات. اذكر معلومات صحيحة فقط، وإن لم تكن متأكدًا فبسّط.
قواعد السبورة (صارمة، تُفحص آليًا وتُرفض المخالفات):
- السبورة 1280 عرضًا × 720 ارتفاعًا. y في text هو خط الأساس للنص.
- أنواع العناصر فقط: text, rectangle, ellipse, line, arrow, highlight. text يحتاج x,y,text,fontSize(24-64),color,align. rectangle/ellipse/highlight تحتاج x,y,w,h. line/arrow تحتاج x,y,x2,y2.
- الألوان فقط: ink, primary, accent, success, danger, muted.
- من 4 إلى 9 عناصر لكل خطوة، بترتيب الكتابة. ids فريدة داخل الخطوة.
- عنوان الخطوة في الأعلى: y بين 70 و110، align="center"، fontSize 44-52.
- منطقة المحتوى: y بين 180 و660 و x بين 60 و1220. لا شيء خارجها.
- عرض النص التقريبي = عدد الحروف × fontSize × 0.5. يجب أن يبقى النص داخل 60..1220 أفقيًا. النص الواحد أقل من 32 حرفًا، وfontSize بين 28 و48 للنصوص العادية.
- لا تضع نصين في نفس المنطقة: المسافة الرأسية بين سطرين أكبر من fontSize × 1.4 على الأقل، وإذا تجاورا أفقيًا فالفراغ بينهما 40 على الأقل.
- النص داخل rectangle/ellipse يجب أن يكون أقصر من w / (fontSize × 0.55) حرفًا.
- الأسهم والخطوط للربط بين الأشياء فقط، ولا تمر فوق نص.`;
}
