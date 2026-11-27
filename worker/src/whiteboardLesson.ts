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
    ? 'اللغة عربية (من اليمين لليسار): النص ذو align="start" يمتد من النقطة x نحو اليسار، و align="end" يمتد نحو اليمين، و align="center" يتمركز حول x. ضع الأشكال والأرقام على الجهة اليمنى والشروحات على يسارها.'
    : 'The language is English (left to right): align="start" extends from x to the right, align="end" extends to the left, align="center" is centred on x.';
  return `أنت معلم خبير تصمم درسًا يُشرح على سبورة. الموضوع: «${topic}». اكتب بـ${language} فقط. ${rtl}
أعد JSON صالحًا فقط بهذا الشكل بالضبط (بدون أي نص خارجه):
{"schema_version":1,"id":"ai-lesson","title":"عنوان قصير","lang":"${lang}","metadata":{"source":"ai","status":"draft"},"steps":[{"id":"s1","title":"عنوان الخطوة","narration":"جملتان إلى أربع جمل مناسبة للقراءة بصوت عالٍ","nodes":[{"id":"n1","type":"text","x":640,"y":90,"text":"عنوان على السبورة","fontSize":48,"color":"primary","align":"center"}]}]}
القواعد الصارمة:
- عدد الخطوات ${steps} بالضبط. كل خطوة لها narration (يُقرأ صوتيًا) و nodes (ما يُكتب ويُرسم أثناء الشرح بالترتيب).
- السبورة 1280 عرضًا × 720 ارتفاعًا. كل الإحداثيات أعداد ضمن هذه الحدود، y في text هو خط الأساس للنص.
- أنواع العناصر المسموحة فقط: text, rectangle, ellipse, line, arrow, highlight. text يحتاج x,y,text,fontSize(24-72),color,align. rectangle/ellipse/highlight تحتاج x,y,w,h. line/arrow تحتاج x,y,x2,y2.
- الألوان المسموحة فقط: ink, primary, accent, success, danger, muted.
- من 3 إلى 8 عناصر لكل خطوة، دون تراكب بين العناصر؛ وزّع العناصر على أجزاء مختلفة من السبورة (عنوان في الأعلى y≈90، المحتوى بين y=200 و y=620).
- النص على السبورة قصير (أقل من 40 حرفًا). لا تكرر narration حرفيًا على السبورة.
- لا تخترع مراجع أو إحصاءات. اذكر معلومات صحيحة فقط، وإن لم تكن متأكدًا فبسّط.
- ids فريدة داخل كل خطوة.`;
}
