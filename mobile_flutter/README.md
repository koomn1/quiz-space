# QuizSpace Mobile

تطبيق Flutter أصلي لـQuizSpace، وليس WebView. يتضمن تسجيل الدخول عبر Supabase Auth، شاشة رئيسية للاختبارات المنشورة، بروفايل المستخدم، شارات أيقونية متجاورة، وزرًا يفتح قائمة «الأعضاء الذين حلوا الاختبار» داخل BottomSheet فوري.

## التشغيل المحلي

ثبّت Flutter stable ثم شغّل:

```bash
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL="https://your-project.supabase.co" \
  --dart-define=SUPABASE_ANON_KEY="your-public-anon-key"
```

المفتاح المستخدم هنا هو Supabase anon key العام فقط. لا تستخدم service-role key أو أي مفتاح إداري داخل التطبيق أو داخل مستودع GitHub.

## Firebase Auth وGoogle native

التطبيق يستخدم Firebase Authentication لتسجيل البريد وكلمة المرور وGoogle. زر Google يستدعي `google_sign_in` native، فيفتح account picker الخاص بنظام Android ويقرأ الحسابات الموجودة على الهاتف؛ لا يستخدم Supabase OAuth ولا يفتح Chrome لتسجيل الدخول.

أضف `google-services.json` كـGitHub Actions Secret باسم `FIREBASE_ANDROID_CONFIG_JSON`، ولا تضعه في source. الـworkflow يكتبه مؤقتًا أثناء البناء، ويثبت Firebase Gradle plugin، ويطابق package `com.quizspace.badawy` مع إعداد Android المرفق.

حتى تصل الجلسة إلى بيانات QuizSpace، فعّل Firebase Third-Party Auth في إعدادات Supabase، وسجّل Firebase project ID، وتأكد أن Firebase JWT يحصل على claim باسم `role` وقيمته `authenticated`. هذه الخطوة تحافظ على RLS بدل استخدام service-role key. فعّل أيضًا Email/Password وGoogle داخل Firebase Authentication.

## البيانات والصلاحيات

يقرأ التطبيق بيانات المستخدم المسجل من جداول `users` و`quizzes` و`completions`، ويستخدم RPC `get_quiz_takers_unique` لقائمة الحلّالين. كل الطلبات تمر من عميل Supabase الموثّق وتظل خاضعة لـRLS والصلاحيات الموجودة في المشروع؛ لا توجد بيانات mock أو ترقيات صلاحيات من الواجهة.

## GitHub Release

التدفق `.github/workflows/mobile-release.yml` يعمل يدويًا من GitHub Actions. يشغّل `flutter analyze` و`flutter test` ثم يبني APK release باستخدام أسرار Actions وقت البناء، ويرفع APK وملف SHA-256 إلى GitHub Release. لا يتم ادعاء دعم iOS أو توقيعه؛ ذلك يحتاج بيئة macOS وشهادة Apple منفصلة.

## التحديث الإجباري داخل التطبيق

كل push إلى فرع `main` يشغّل workflow الهاتف تلقائيًا، ويرفع Release جديدًا بصيغة `mobile-v1.0.<run-number>`. التطبيق يقرأ أحدث Release من GitHub عند فتحه، ويقارن النسخة المثبتة، ثم يعرض شاشة تحديث إجبارية إذا وجد إصدار أعلى. التنزيل يتم داخل التطبيق مع نسبة تقدم وفحص SHA-256، وبعدها يفتح مثبت Android لتأكيد التثبيت فوق النسخة الحالية.

التثبيت الصامت غير ممكن لتطبيق Android عادي؛ Android سيطلب تأكيد المستخدم، وقد يطلب تفعيل السماح بالتثبيت من هذا المصدر. لا يتم حذف بيانات Firebase أو ملفات التطبيق أثناء التحديث. لكي يقبل Android التحديث فوق النسخة السابقة، يجب أن تستخدم كل الإصدارات **نفس مفتاح التوقيع**.

يحتاج GitHub Actions إلى الأسرار التالية: `FIREBASE_ANDROID_CONFIG_JSON`، و`ANDROID_KEYSTORE_BASE64`، و`ANDROID_KEYSTORE_PASSWORD`، و`ANDROID_KEY_PASSWORD`، و`ANDROID_KEY_ALIAS`. ملف Firebase وkeystore لا يدخلان Git أو APK source، بل يُستخدمان وقت البناء فقط. يجب أن تكون قيمة `ANDROID_KEYSTORE_BASE64` لنفس keystore المستخدم في كل الإصدارات السابقة؛ تغيير المفتاح يجعل Android يرفض التحديث فوق النسخة المثبتة.

## الصلاحيات

تُطلب الإشعارات مرة واحدة بعد أول دخول ناجح، بينما الكاميرا والصور تُطلبان من شاشة «إدارة الصلاحيات» أو عند استخدام الميزة. اختيار الملفات يعتمد على Android system picker ولا يحتاج صلاحية قراءة كل مساحة التخزين. تحديث APK يحتاج `REQUEST_INSTALL_PACKAGES`، ويُطلب فقط عند بدء التحديث.
