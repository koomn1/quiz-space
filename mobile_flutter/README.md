# QuizSpace Mobile

تطبيق Flutter أصلي لـQuizSpace، وليس WebView. يتضمن تسجيل الدخول عبر Firebase Auth، شاشة رئيسية للاختبارات المنشورة، بروفايل المستخدم، شارات أيقونية متجاورة، وزرًا يفتح قائمة «الأعضاء الذين حلوا الاختبار» داخل BottomSheet فوري.

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

التطبيق يرسل Firebase ID token إلى Edge Function باسم `mobile-firebase-session-v2`. الخادم يتحقق من توقيع Firebase والبريد المؤكَّد، ثم يبحث عن سجل QuizSpace القديم بالبريد ويعيد UID القديم دون تغييره، أو ينشئ سجلًا جديدًا للمستخدم الجديد. لا يوجد service-role key داخل التطبيق، ولا يعتمد مسار البروفايل على Firebase JWT داخل RLS مباشرة. يجب أن يكون Firebase project المستخدم في `google-services.json` هو مشروع QuizSpace، مع تفعيل Email/Password وGoogle داخل Firebase Authentication.

## البيانات والصلاحيات والاتصال

التطبيق لا يحوّل صفحات الموقع إلى WebView ولا ينسخ الاختبارات أو البروفايل كبيانات ثابتة داخل APK. عند فتحه يحتاج اتصالًا بالإنترنت، ثم يحمّل بيانات الحساب والاختبارات والمحاولات من Edge Function وSupabase بعد التحقق من Firebase ID token. في حالة عدم وجود الإنترنت تظهر شاشة واضحة لإعادة المحاولة بدل فتح نسخة قديمة أو ناقصة.

روابط `https://quiz-space-app.pages.dev/...` و`https://quiz-space-share.pages.dev/...` يتم تعريفها كـAndroid App Links. عند تثبيت التطبيق والتحقق من `assetlinks.json`، يرسل Android الرابط إلى التطبيق، ويستخرج التطبيق رقم الكويز ثم يفتح شاشة الحل Native ويطلب تفاصيل الكويز من السيرفر. الروابط غير التابعة لدوميني QuizSpace يتم تجاهلها.


يقرأ التطبيق بيانات المستخدم المسجل من جداول `users` و`quizzes` و`completions`، ويستخدم RPC `get_quiz_takers_unique` لقائمة الحلّالين. القراءة الخاصة تتم داخل Function بعد التحقق من Firebase وبـservice-role محفوظ على الخادم فقط؛ التطبيق لا يستطيع تعديل `uid` أو `is_admin` أو `is_premium` ولا يحمل أي مفتاح إداري.

## GitHub Release ونسخ الاختبار

التدفق `.github/workflows/mobile-release.yml` يدوي فقط، ولا ينشر APK تلقائيًا عند كل push. قبل النشر يشغّل `flutter analyze` و`flutter test` ويبني APK release موقّعًا باستخدام أسرار Actions وقت البناء. أما `mobile-native-ci.yml` فيتحقق تلقائيًا من الكود ويبني APK debug، ويمكنه إنتاج APK release موقّع للاختبار على الجهاز بدون إنشاء Release عام.

نسخ release الموقّعة تستخدم R8 وresource shrinking من خلال `proguard-android-optimize.txt` لتقليل وضوح الـDEX وتقليل الموارد غير المستخدمة. ده يرفع تكلفة التحليل والهجمات السطحية، لكنه ليس تشفيرًا مطلقًا؛ لا ينبغي وضع أسرار أو مفاتيح إدارية داخل APK.

## التحديث الإجباري داخل التطبيق

التطبيق يقرأ أحدث Native Release المسموح به عند فتحه، ويقارن النسخة المثبتة، ثم يعرض شاشة تحديث إجبارية إذا وجد إصدار أعلى. التنزيل يستخدم Android DownloadManager داخل مجلد التطبيق، لذلك يستمر بعد إغلاق QuizSpace ويستعيد حالته ونسبته عند فتحه مرة أخرى. بعد اكتمال الكاش فقط يظهر زر التثبيت؛ عند الضغط يُفحص SHA-256 ثم يفتح مثبت Android لتأكيد التثبيت فوق النسخة الحالية.

التثبيت الصامت غير ممكن لتطبيق Android عادي؛ Android سيطلب تأكيد المستخدم، وقد يطلب تفعيل السماح بالتثبيت من هذا المصدر. لا يتم حذف بيانات Firebase أو ملفات التطبيق أثناء التحديث، وملف APK الجاهز لا يُعاد تنزيله عند فتح التطبيق. لكي يقبل Android التحديث فوق النسخة السابقة، يجب أن تستخدم كل الإصدارات **نفس مفتاح التوقيع**.

يحتاج GitHub Actions إلى الأسرار التالية: `FIREBASE_ANDROID_CONFIG_JSON`، و`ANDROID_KEYSTORE_BASE64`، و`ANDROID_KEYSTORE_PASSWORD`، و`ANDROID_KEY_PASSWORD`، و`ANDROID_KEY_ALIAS`. ملف Firebase وkeystore لا يدخلان Git أو APK source، بل يُستخدمان وقت البناء فقط. يجب أن تكون قيمة `ANDROID_KEYSTORE_BASE64` لنفس keystore المستخدم في كل الإصدارات السابقة؛ تغيير المفتاح يجعل Android يرفض التحديث فوق النسخة المثبتة.

## الصلاحيات

تُطلب الإشعارات مرة واحدة بعد أول دخول ناجح، بينما الكاميرا والصور تُطلبان من شاشة «إدارة الصلاحيات» أو عند استخدام الميزة. اختيار الملفات يعتمد على Android system picker ولا يحتاج صلاحية قراءة كل مساحة التخزين. تحديث APK يحتاج `REQUEST_INSTALL_PACKAGES`، ويُطلب فقط عند بدء التحديث.
