# Logo asset findings

تمت معاينة أصلين موجودين بالفعل داخل `mobile_flutter/assets/`:

| الملف | الوصف | الاستخدام المقترح |
|---|---|---|
| `quizspace-icon.png`، 192×192 | شعار QuizSpace الرسمي: كوكب/سحابة بنفسجية مع علامة استفهام وصاروخ واسم QuizSpace | Android launcher icon والـapp icon الأساسي |
| `quizspace-logo.webp`، 512×512 | رمز QuizSpace الكوني ثلاثي الأبعاد بعلامة الاستفهام، بخلفية شفافة | Splash/login/profile brand mark داخل الواجهات |

المشكلة الحالية أن workflow ينشئ Android project ثم لا ينسخ هذه الأصول إلى `android/app/src/main/res/mipmap-*`، لذلك يظل launcher على أيقونة Flutter الافتراضية. الحل المطلوب هو مولّد deterministic ينسخ `quizspace-icon.png` إلى density buckets أو يستخدمه في adaptive icon قبل `flutter build`، مع استخدام `quizspace-logo.webp` داخل Flutter عبر assets.
