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

## البيانات والصلاحيات

يقرأ التطبيق بيانات المستخدم المسجل من جداول `users` و`quizzes` و`completions`، ويستخدم RPC `get_quiz_takers_unique` لقائمة الحلّالين. كل الطلبات تمر من عميل Supabase الموثّق وتظل خاضعة لـRLS والصلاحيات الموجودة في المشروع؛ لا توجد بيانات mock أو ترقيات صلاحيات من الواجهة.

## GitHub Release

التدفق `.github/workflows/mobile-release.yml` يعمل يدويًا من GitHub Actions. يشغّل `flutter analyze` و`flutter test` ثم يبني APK release باستخدام أسرار Actions وقت البناء، ويرفع APK وملف SHA-256 إلى GitHub Release. لا يتم ادعاء دعم iOS أو توقيعه؛ ذلك يحتاج بيئة macOS وشهادة Apple منفصلة.
