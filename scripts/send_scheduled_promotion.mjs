const messages = [
  ['فرصتك تبدأ الآن', 'افتح المنصة وخد خطوة جديدة نحو درجتك الأفضل. كويز قصير اليوم قد يصنع فرقاً كبيراً.', '/quiz-space/#/explore'],
  ['جاهز تكسر رقمك؟', 'راجع نقاط ضعفك، حل كويزاً جديداً، وشاهد تقدمك يتغير أمامك.', '/quiz-space/#/explore'],
  ['دقائق قليلة تصنع تقدماً كبيراً', 'اختبر نفسك الآن في موضوع تحبه واجمع XP جديداً قبل أن تنشغل.', '/quiz-space/#/explore'],
  ['كويز جديد بانتظارك', 'لا تترك التحدي يفوتك. افتح المنصة واكتشف اختباراً مناسباً لمستواك.', '/quiz-space/#/explore'],
  ['خلّي مذاكرتك أذكى', 'استخدم الكويزات وبطاقات الاستذكار لتعرف ما أتقنته وما يحتاج مراجعة.', '/quiz-space/#/flashcards'],
  ['مستواك يتحسن مع كل محاولة', 'أعد الاختبار، حسّن نتيجتك، وخلي أفضل محاولاتك ترفع ترتيبك.', '/quiz-space/#/explore'],
  ['لا تنسَ تحدي اليوم', 'تحدٍ جديد ينتظرك. ادخل الآن وحافظ على سلسلة إنجازك اليومية.', '/quiz-space/#/daily'],
  ['مجتمعك أضاف شيئاً جديداً', 'شاهد آخر المشاركات، شارك برأيك، واستفد من خبرات باقي الطلاب.', '/quiz-space/#/community'],
  ['فصلُك يتحرك', 'قد يكون هناك إعلان أو ملف أو اختبار جديد في أحد فصولك. افتح المنصة وتابع كل شيء.', '/quiz-space/#/classrooms'],
  ['اختبر ذاكرتك الآن', 'حوّل وقت الفراغ إلى مراجعة مفيدة من خلال كويز سريع وممتع.', '/quiz-space/#/explore'],
  ['هدفك أقرب مما تتخيل', 'إنجاز واحد الآن قد يقرّبك من المستوى التالي. ابدأ بكويز واحد فقط.', '/quiz-space/#/profile'],
  ['وقت المراجعة المثالي', 'ارجع للنقاط التي أخطأت فيها سابقاً وحوّل أخطاءك إلى نقاط قوة.', '/quiz-space/#/flashcards'],
  ['هل تستطيع تحقيق نتيجة أعلى؟', 'جرّب تحسين محاولتك السابقة، فالمنصة تحفظ أفضل نتيجة لك.', '/quiz-space/#/explore'],
  ['اكتشف موضوعاً جديداً', 'مجالات كثيرة وكويزات متنوعة في انتظارك. اختر موضوعاً وابدأ التعلم.', '/quiz-space/#/explore'],
  ['افتح SpaceQuiz الآن', 'كل دخول فرصة جديدة للتعلم والإنجاز. ابدأ بجولة قصيرة واجعل يومك أفضل.', '/quiz-space/#/explore'],
];
const slot = Math.floor(Date.now() / (6 * 60 * 60 * 1000));
const [title, body, url] = messages[slot % messages.length];
const response = await fetch(`${process.env.SUPABASE_FUNCTION_URL}/send-promotion-push`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-promotion-cron-secret': process.env.PROMOTION_CRON_SECRET },
  body: JSON.stringify({ title: `🎁 ${title}`, body, url, category: 'promotion' }),
});
const text = await response.text();
if (!response.ok) throw new Error(`${response.status}: ${text}`);
console.log(text);
