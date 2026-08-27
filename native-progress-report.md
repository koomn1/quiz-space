# تقرير تقدم QuizSpace Native

## الملخص

تم تثبيت مسار Flutter Native كتطبيق Android حقيقي، مع إلغاء مسار Capacitor/WebView من الإصدار. لا يوجد WebView أو iframe أو تسجيل دخول عبر Chrome داخل التغييرات الحالية. لم يتم إصدار APK نهائي جديد؛ النشر النهائي متوقف عمدًا إلى أن تكتمل بقية وظائف الموقع واختبار UAT على جهاز Android حقيقي.

## ما تم تنفيذه

| المجال | الحالة الحالية |
|---|---|
| Firebase email/password | تسجيل وإنشاء حساب وتأكيد البريد داخل التطبيق، مع رسالة تأكيد محفوظة بعد signOut |
| Google | Google native account picker من حسابات الجهاز عبر `google_sign_in` ثم Firebase credential |
| ربط الحساب القديم | Function server-side تتحقق من Firebase token والبريد المؤكد وتربط الحساب القديم بالبريد بدون تغيير `users.uid` |
| التنقل | Native shell بخمسة تبويبات كحد أقصى: الرئيسية، اختباراتي، إنشاء، Cosmo، حسابي |
| الاختبارات | قائمة الاختبارات، تفاصيل الاختبار، إنشاء اختبار MCQ Native، وحل سؤال واحد في كل مرة مع شريط تقدم وأزرار ثابتة |
| الحفظ | الدرجة تُحسب على الخادم، ومحاولة الحل تُحفظ عبر RPC لا يستطيع العميل تزويرها، مع XP idempotent نسبيًا حسب المحاولة/أفضل نتيجة |
| اكتشف | بحث وتصنيف للاختبارات العامة، مع فتح الحل مباشرة داخل Flutter |
| الحساب | تعديل الاسم والنبذة والموقع، الشارات والإحصائيات الحالية، Analytics قراءة فقط |
| الإعدادات | استعادة كلمة المرور، إعدادات التنبيهات، تفضيلات البريد/الترتيب/الملخص الأسبوعي، والصلاحيات عند الحاجة فقط |
| السوبر أدمن | شاشة مؤشرات قراءة فقط تظهر للحساب الذي يؤكد الخادم أنه `is_admin`؛ لا توجد عمليات إدارية تعديل من الهاتف بعد |
| Cosmo | Native UI يتصل بالـWorker عبر Firebase ID token؛ OpenRouter يبقى server-side، ولا يوجد مفتاح AI داخل APK |
| التحديث | DownloadManager في الخلفية، استئناف بعد إغلاق التطبيق، cache، SHA-256، وتثبيت فوق النسخة القديمة مع بقاء تأكيد Android اليدوي مطلوبًا |

## الـbackend

تم تحديث ونشر `mobile-firebase-session-v2` بنسخة Active تشمل `public_quizzes`، وتعديل البروفايل، وتفضيلات الإشعارات، ومؤشرات Admin، وحفظ المحاولات. تم تطبيق Migration `20260827_mobile_quiz_attempts` على مشروع QuizSpace الصحيح. لا توجد service-role credentials داخل Flutter.

تم أيضًا إزالة تمرير مفتاح OpenRouter من builds الويب؛ استدعاءات AI تمر من Worker فقط. آخر نشر Build & Deploy نجح، وWorker نشره workflow بنجاح.

## التحقق

نجح Native CI على آخر شرائح التطوير، بما في ذلك `flutter analyze` و`flutter test` و`flutter build apk --debug`. آخر run ناجح كان بعد إصلاح parser الخاص بلوحة Admin. Git working tree نظيف بعد آخر push.

تم تعطيل النشر التلقائي لـMobile Release أثناء التطوير، وإضافة Native CI منفصل لا ينشر Release. Updater يرفض أي إصدار أقل من `3.0.0`، لذلك إصدارات WebView/Prototype القديمة مثل `mobile-v2.0.3` لا تُفرض على التطبيق Native.

## ما لم يُعتبر مكتملًا بعد

التطبيق ليس مكافئًا لكل صفحات الموقع حتى الآن. المتبقي قبل Release Native كامل هو استخراج الملفات وربط progress/preview/حل الاختبار، تحرير الاختبارات ومشاركتها دون حذف غير مقصود، المتجر والمكافآت والإطارات والعجلة، الفصول والدعم، إدارة Admin التفصيلية، وبعض إعدادات الأمان/الإشعارات، ثم اختبار تسجيل Firebase وGoogle والحساب القديم على جهاز Android حقيقي.

لن يتم نشر APK Release أو تسليمه على أنه «التطبيق الكامل» قبل نجاح هذه المسارات، وفحص توقيع Android واستمرارية `versionCode`، واختبار UAT بحساب المستخدم الحقيقي.

## المراجع البرمجية

- Repository: https://github.com/koomn1/quiz-space
- آخر commit: `71395b8`
- CI workflow: `.github/workflows/mobile-native-ci.yml`
- Release workflow اليدوي: `.github/workflows/mobile-release.yml`
- Flutter Native: `mobile_flutter/`
- Firebase bridge: `supabase/functions/mobile-firebase-session/`
