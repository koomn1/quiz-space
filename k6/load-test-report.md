# تقرير اختبار التحميل باستخدام k6 — Quiz Space

## الملخص التنفيذي

تم تنفيذ اختبار تحميل read-only على نسخة الواجهة المنشورة في GitHub Pages، باستخدام **100 مستخدم افتراضي متزامن كحد أقصى**. كل مستخدم مرّ بالتتابع على **30 route منطقيًا** من routes التطبيق المعروفة، مع طلبات `GET` فقط وفحوصات لرمز HTTP ووجود app shell. لم يتضمن الاختبار تسجيل دخول أو إرسال نماذج أو إنشاء/تعديل/حذف بيانات.

النتيجة التشغيلية جيدة جدًا لهذا النوع من الاختبار: نجحت جميع فحوصات الاستجابة، ولم تُسجل أخطاء HTTP، وكان متوسط زمن الاستجابة 3.58ms وP95 يساوي 5.52ms وP99 يساوي 13.13ms، مع أقصى استجابة 237.33ms. اجتاز الاختبار thresholds المحددة في k6.

> هذه النتيجة تقيس طبقة HTTP والـ static app shell أساسًا. لأن التطبيق SPA ويستخدم hash routing، فإن fragment مثل `#/dashboard/community` لا يُرسل إلى الخادم؛ لذلك تم وسم كل route منطقيًا داخل k6 مع إرسال query cache-busting إلى نفس app shell. الاختبار لا يمثل زمن تنفيذ React أو استعلامات Supabase أو تحميل lazy chunks داخل متصفح حقيقي.

## إعداد الاختبار

| البند | القيمة |
|---|---|
| الأداة | k6 v2.2.0 |
| الهدف | `https://koomn1.github.io/quiz-space/` |
| نمط الحمل | Ramping VUs |
| التدرج | 0 → 100 خلال 30 ثانية |
| الثبات | 100 VU لمدة 90 ثانية |
| الإنهاء | 100 → 0 خلال 15 ثانية |
| العمليات | GET فقط، بدون كتابة أو auth |
| User-Agent | `QuizSpace-k6-readonly/1.0` |
| زمن الانتظار بين routes | ثانية واحدة لكل VU |

## تغطية الصفحات

تم اختبار routes التالية كـ logical SPA pages: landing، dashboard-landing، explore، categories، community، leaderboard، achievements، motivation، motivation-lucky، motivation-brain، motivation-review، motivation-season، motivation-duel، motivation-store، analytics، create، my-quizzes، notifications، messages، classrooms، institution، bookmarks، settings، support، billing، aichat، profile، quiz، join، وadmin.

كل route نفّذ فحصين: وصول HTTP بحالة 200، ووجود app shell بحجم استجابة أكبر من 1000 بايت. نجحت الفحوصات لكل route الذي وصل إليه الحمل أثناء فترة الاختبار، ولم يفشل أي check.

## النتائج الرقمية

| المقياس | النتيجة |
|---|---:|
| الحد الأقصى للمستخدمين المتزامنين | 100 |
| إجمالي HTTP requests | 12,108 |
| إجمالي checks | 24,216 |
| checks الناجحة | 24,216 (100%) |
| HTTP failures | 0 (0%) |
| متوسط زمن HTTP | 3.58ms |
| الوسيط | 2.96ms |
| P90 | 4.44ms |
| P95 | 5.52ms |
| P99 | 13.13ms |
| أقصى زمن مسجل | 237.33ms |
| متوسط throughput | 83.50 request/s |
| التكرارات المكتملة | 354 |
| التكرارات المتوقفة أثناء ramp-down | 76 |

## تفسير النتيجة

لم يظهر ضغط مؤثر على GitHub Pages عند 100 VU في اختبار app shell. انخفاض زمن الاستجابة متوقع لأن GitHub Pages يستخدم شبكة CDN لملفات static، ولأن الاختبار لم ينفذ JavaScript داخل متصفح ولم يرسل طلبات Supabase أو Worker الداخلية.

التكرارات المتوقفة أثناء ramp-down ليست فشلًا في الطلبات؛ فقد تم إيقاف بعض المستخدمين الافتراضيين أثناء خفض الحمل بعد انتهاء مرحلة الثبات. جميع الطلبات التي تم تنفيذها اجتازت فحوصات HTTP وapp shell.

## الفجوات التي لا يغطيها هذا الاختبار

لا يقيس الاختبار زمن أول رسم أو تفاعل المستخدم، ولا تشغيل React وlazy routes، ولا تحميل CSS/JS والصور من داخل متصفح، ولا استعلامات Supabase التي تنفذها كل صفحة بعد mount، ولا endpoints الخاصة بالـ Worker، ولا تدفقات المصادقة أو الدفع أو رفع الملفات. كما أن اختبار المسارات الـ hash لا يرسل fragment إلى الخادم بحكم سلوك HTTP الطبيعي.

## التوصيات

يوصى بإضافة اختبار browser-level منفصل بعد توفير بيئة staging، بحيث يشغّل عددًا أقل من المتصفحات الفعلية ويقيس LCP وDOMContentLoaded وlazy chunk failures وطلبات Supabase لكل route. كما يوصى باختبار Worker وSupabase read-only في سيناريو مستقل بمفاتيح anon وبيانات staging، ثم اختبار تدفقات الكتابة في بيئة staging فقط مع بيانات اختبار قابلة للحذف.

يوصى أيضًا بتسجيل نتائج k6 في CI على مستوى smoke load صغير، مع إبقاء اختبار 100 VU اختبارًا مجدولًا لا يُشغّل تلقائيًا على الإنتاج عند كل commit. في حال أصبح النشر الأساسي هو `quizspace.app` بدل GitHub Pages، يجب إعادة تشغيل السيناريو باستخدام `BASE_URL=https://quizspace.app/lander/` بعد التأكد من أن `/lander/` يعرض SPA كاملة؛ الجذر الحالي للنطاق المخصص يعيد صفحة تحويل قصيرة إلى `/lander` ولا يمثل app shell نفسه.

## الملفات

السيناريو القابل لإعادة التشغيل موجود في `k6/load-test.js`، والملخص الخام الناتج من التشغيل محفوظ خارج المستودع في `/tmp/quizspace-k6-summary.json`.
