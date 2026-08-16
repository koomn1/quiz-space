# QuizSpace Playwright E2E

تشغّل اختبارات Playwright العامة ضد النسخة المنشورة افتراضياً على `https://koomn1.github.io/quiz-space/`. يمكن تغيير الهدف محلياً باستخدام `PLAYWRIGHT_BASE_URL`، مثلاً `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173/quiz-space/ npm run e2e` بعد تشغيل Vite.

## التثبيت والتشغيل

```bash
npm install
npx playwright install chromium
npm run e2e
```

اختبار `published profile asset delivery` لا يحتاج تسجيل دخول؛ فهو يفتح كل WebP replacement مباشرة داخل Chromium ويتحقق من status، content type، و`naturalWidth` و`naturalHeight`. أما اختبارات اختيار الأفتار والإطار والحفظ بعد refresh فهي محمية بشرطين: `E2E_PROFILE_ID` و`PLAYWRIGHT_STORAGE_STATE`. عند غيابهما تُعلّق هذه الاختبارات عمداً بدلاً من تنفيذ تغيير على حساب غير مقصود.

## الاختبار المصادق عليه

استخدم حساب اختبار مخصصاً فقط، وليس حساباً شخصياً أو حساب مستخدم حقيقي. بعد إنشاء ملف Playwright storage state محلياً من جلسة الاختبار، شغّل:

```bash
E2E_PROFILE_ID=<test-profile-uuid> \
PLAYWRIGHT_STORAGE_STATE=playwright/.auth/profile.json \
npm run e2e -- e2e/profile-assets.spec.ts
```

يجب أن يكون `playwright/.auth` متجاهلاً في Git، وألا تُرسل ملفات storage state إلى المستودع أو سجلات CI؛ فهي قد تحتوي على جلسة دخول قابلة للاستخدام.

## ما تغطيه الاختبارات

تتحقق الاختبارات من أن جميع الأفتارات والإطارات replacement قابلة للوصول كصور WebP، وأن محرر الملف يعرض ستة أفتارات فريدة وإطارات لا تفشل في التحميل، وأن اختيار أفتار وإطار ثم حفظهما يبقى موجوداً بعد إعادة تحميل الصفحة. كما يفحص سيناريو الهاتف ألا تقل أبعاد أزرار الاختيار عن 44×44 بكسل.
