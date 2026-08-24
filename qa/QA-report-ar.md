# تقرير QA الشامل — Quiz Space

**التاريخ:** 24 أغسطس 2026  
**النطاق:** الواجهة المنشورة على GitHub Pages، اختبارات المشروع المحلية، Supabase الحي للقراءات والفحوص الآمنة فقط، وحزمة QA المضافة إلى المستودع.  
**الفرع والنسخة:** `main`، والـcommit الأخير لحزمة QA هو `fe2e429`.  
**قرار الإصدار:** **Blocked / غير معتمد للإطلاق النهائي بعد**؛ ليس بسبب فشل واحد فقط، بل لأن مسار الأعمال الكامل والدفع التجريبي وUAT الحقيقي ومصفوفة الصلاحيات بحسابات staging لم تتوفر بياناتها الآمنة بعد.

## 1. الملخص التنفيذي

تم تنفيذ فحص واسع يغطي مسارات SPA، المتصفحات والأجهزة المحاكاة، اختبارات الحمل والضغط، الفحص الساكن للأمان، فحص الحزمة المنشورة، مؤشرات الأداء، والانقطاع الشبكي. أُضيفت حزمة قابلة لإعادة التشغيل تحت `qa/` مع أوامر `qa:e2e` و`qa:perf` و`qa:security`، كما أُصلح عيب حقيقي في زر «تخطي» كان أصغر من حد اللمس المستخدم في اختبار الوصول، ثم أُعيد نشره والتحقق منه حيًا.

النتيجة الحالية هي أن **الـapp shell ومسارات القراءة العامة مستقران تحت الحمل المعتدل**، وأن فحوص المشروع البرمجية والأمنية الساكنة ناجحة. في المقابل، لا يجوز وصف العمل بأنه E2E كامل من التسجيل حتى النتيجة؛ الاختبار التجاري ما زال gated لأنه يتطلب هوية staging وقسيمة أو مزود دفع sandbox. كما أن نتيجة stress تُظهر بداية تدهور عند نحو 400 VU على GitHub Pages/CDN، وهي ليست قياسًا لقدرة React أو Supabase أو Cloudflare Worker.

> **الخلاصة العملية:** الإصدار صالح لفحوص staging/UAT المنظمة بعد إغلاق عناصر الحجب أدناه، لكنه غير صالح لإعلان نجاح كامل لمسار التسجيل → الاستخدام → الدفع → النتيجة.

## 2. مصفوفة الحالة

| المجال | الحالة | الدليل أو القياس | الملاحظة الحاسمة |
|---|---|---|---|
| اختبارات المشروع | **Pass** | 51 ملف Vitest، 155 اختبارًا ناجحًا؛ TypeScript وbuild ناجحان | Lint: صفر أخطاء و334 تحذير جودة غير حاجب |
| QA route smoke | **Pass** | 30 route منطقيًا عبر 5 مشاريع؛ لا crash ظاهر في المسارات المشمولة | اختبار route يعزل Service Worker عمدًا |
| الوصول وحجم أهداف اللمس | **Pass** | Firefox كشف زر «تخطي» بحجم 66.68×34px؛ بعد التعديل نجح الاختبار المستهدف حيًا والمصفوفة الكاملة | أُغلق العيب في `fe2e429` |
| E2E التجاري الكامل | **Blocked** | الاختبار gated | لا توجد credentials staging ولا sandbox payment/coupon صالح؛ لا تسجيل/حل/checkout/receipt حقيقي |
| Load 100 VU | **Pass for app shell only** | 12,108 طلبًا، HTTP failure = 0%، P95=5.52ms، P99=13.13ms | يقيس static app shell/CDN فقط بسبب hash routes |
| Stress | **Degradation observed** | استقرار 200 VU؛ عند hold 400 بلغ error rate 36.95%؛ recovery 20/20 HTTP 200 بمتوسط 38.4ms | لا تُكرر 400+ على الإنتاج بلا نافذة وموافقة؛ ليس قياسًا للـbackend |
| OWASP/static security | **Pass with residual findings** | audit production = 0؛ لا secret داخل bundle ولا source maps؛ لا `eval` أو `dangerouslySetInnerHTML` في الإنتاج وفق الفحص | CORS/headers وSupabase Advisor يحتاجان معالجة أو توثيقًا واعتمادًا |
| RLS/auth authorization matrix | **Blocked/Pending** | الإصلاحات الأمنية v2–v7 طُبقت بنجاح على Supabase | لا يمكن استخدام حسابات إنتاج؛ يلزم staging فيه anon/user A/user B/admin |
| Failure/recovery | **Partial Pass** | offline browser smoke نجح، والـapp shell بقي ظاهرًا ثم عاد بعد الاتصال | لم يُختبر DB/API timeout أو فشل دفع sandbox |
| Performance/CWV | **Measured smoke** | FCP/LCP بين 496–952ms في القياس، وحجم transfer بين 4.65–9.63MB | ليس Lighthouse رسميًا ولا بيانات RUM؛ حجم الحزمة مرتفع ويحتاج تحسينًا |
| UAT | **Not executed** | تم تجهيز script ومعايير القبول | يتطلب 5–8 مشاركين حقيقيين غير مُدرّبين على staging |

## 3. نتائج E2E والمسارات

اختبارات QA الحالية تفتح 30 مسارًا منطقيًا عبر Chromium Desktop وFirefox Desktop وWebKit Desktop وPixel 7 وiPhone 13، وتتحقق من ظهور `body` وعدم وجود page crash أو horizontal overflow. التشغيل التسلسلي النهائي على النسخة المنشورة بعد انتشار الإصلاح أعطى **170 passed، 0 failed، 5 skipped خلال 9.4 دقائق**. كان الفشل السابق في Firefox حقيقيًا، إذ كان زر «تخطي» بارتفاع 34px، وأُغلق بعد التعديل.

تم تعديل `src/components/SplashScreen.tsx` ليستخدم `min-h-11 min-w-11` مع `inline-flex items-center justify-center`. إعادة الاختبار المستهدف على Firefox حيًا أعطت **1 passed**، ثم أكدت المصفوفة الكاملة النتيجة نفسها. الاختبارات الخمسة المتخطاة هي مسار الأعمال التجاري gated بسبب غياب staging credentials وsandbox payment، مرة لكل مشروع.

المسار التجاري الكامل لا يزال محميًا بشرط وجود `QA_TEST_EMAIL` و`QA_TEST_PASSWORD` و`QA_TEST_COUPON`. النسخة الحالية من الاختبار لا تنشئ quiz ولا تحلّه ولا تتحقق من persistence أو receipt؛ هي scaffold آمن فقط. لا ينبغي تحويل هذا إلى Pass بالاعتماد على زيارة URL أو ظهور الصفحة.

## 4. Load وStress وRecovery

اختبار الحمل read-only شغّل 100 مستخدم متزامن على 30 route hash. نتجت 12,108 طلبات بلا فشل HTTP، مع P95=5.52ms وP99=13.13ms. هذه الأرقام منخفضة ومتوقعة لمسار static app shell خلف CDN، ولا تمثل زمن تفاعل React أو استدعاءات Supabase أو Worker داخل متصفح حقيقي.

اختبار الضغط المتدرج أثبت استقرارًا عند 200 VU، ثم بدأت أخطاء EOF/connection reset أثناء ramp إلى 400 VU. عند hold 400 VU بلغ error rate **36.95%**. بعد خفض الحمل نجح recovery smoke في 20/20 طلبًا بمتوسط **38.4ms**. التوصية هي تسجيل هذا كحد تشغيلي خاص بالـstatic hosting، وعدم تكرار مستويات 400+ على الإنتاج بلا نافذة اختبار وموافقة؛ ولقياس server consumption الحقيقي يجب تشغيل الاختبار على staging مع endpoints الفعلية ومراقبة Supabase/Worker.

## 5. الأمن وفق OWASP ومراجعة السطح الهجومي

تم تشغيل `qa/run-security-scan.sh`، وشمل dependency audit، أنماط secrets، XSS/injection الشائعة، وجرد auth/API surface. نتيجة `pnpm audit --prod` هي **0 ثغرات معروفة** في low/moderate/high/critical. فحص bundle المنشور لم يجد مفاتيح على نمط OpenAI أو AWS أو private keys أو service-role strings، ولم يجد source map مكشوفًا. التطابق الوحيد السابق كان false positive في test contract متعلقًا باسم `local_auth_token`.

فحص HTTP للواجهة المنشورة وجد HSTS، لكنه لم يجد CSP أو X-Frame-Options أو X-Content-Type-Options أو Referrer-Policy في استجابة GitHub Pages. كما أن الاستضافة الساكنة تعيد `Access-Control-Allow-Origin: *`. هذه ليست ثغرة RLS تلقائيًا، لكنها توسع سطح المتصفح وتضعف طبقة الدفاع العميقة؛ يفضل وضع الواجهة خلف استضافة أو proxy يسمح بضبط headers، أو توثيق المخاطر وقبولها رسميًا.

الفحص الديناميكي غير الموثق للـAPI أعاد 401 كما هو متوقع عند غياب publishable key. لم تُنفذ قراءة anonymous كاملة لجداول private أو مصفوفة cross-user كاملة، لأن ذلك يتطلب استخدام publishable key وحسابات staging مستقلة مع ضمان عدم لمس بيانات الإنتاج. لا يجوز اعتبار 401 وحدها إثباتًا لصحة كل RLS policy.

أظهر Supabase Security Advisor **118 lint items: 117 WARN و1 INFO**. التفاصيل هي 109 تحذيرات لدوال `SECURITY DEFINER` قابلة للتنفيذ من authenticated، و7 تحذيرات لدوال public مقصودة لعرض profile/completion allow-list، وتحذير واحد عن حماية كلمات المرور المسرّبة، وINFO واحد عن `web_vitals` المفعّل عليه RLS دون policy مباشرة ويعتمد على RPC للتحقق. تحذيرات SECURITY DEFINER ليست دليل exploit وحدها، لكنها تتطلب authorization matrix واختبارات ملكية/دور لكل RPC؛ كما يجب تفعيل leaked-password protection في Supabase Auth قبل الاعتماد النهائي.

## 6. Failure وRecovery

اختبار الشبكة يضع browser context في offline، يعيد تحميل route community، ويتحقق من بقاء app shell ظاهرًا، ثم يعيد الاتصال ويفتح route جديدًا. هذا الاختبار نجح في Chromium ضمن التشغيل التسلسلي. لكنه لا يعادل تعطيل Supabase أو Worker أو محاكاة timeout متعمد؛ لم تُنفذ database failure على الإنتاج حتى لا تتغير حالة النظام، ولم يُختبر payment failure إلا بعد توفير sandbox.

يجب أن تتضمن المرحلة التالية اعتراضًا آمنًا لطلبات Supabase/AI Worker في staging مع status 408/429/500 وdelay، والتحقق من رسالة عربية مفهومة، زر retry، وعدم إنشاء نتيجة أو عملية دفع مكررة. أما DB outage الحقيقي فيُختبر عبر staging fault injection أو نافذة يملكها فريق البنية التحتية، لا عبر قاعدة الإنتاج.

## 7. Browser وMobile Compatibility

المصفوفة الحالية تستخدم Chromium Desktop كبديل Chrome، Firefox Desktop، WebKit Desktop كـSafari-like، وملفي Pixel 7 وiPhone 13 المحاكيين. لا يوجد اختبار Edge فعلي مستقل؛ Chromium لا يثبت توافق Edge بنسبة 100%. كذلك فإن Pixel/iPhone محاكاة viewport وليسا جهازين حقيقيين، لذلك يلزم اختبار smoke يدوي على Chrome Android وSafari iOS الحقيقيين قبل إطلاق واسع.

حُجب Service Worker داخل `qa/playwright.qa.config.ts` لعزل route compatibility عن ضوضاء تسجيل `sw.js` في WebKit/iOS. هذا لا يلغي ضرورة تشغيل اختبار Service Worker المستقل الموجود في الاختبارات الأصلية؛ ينبغي إبقاؤه منفصلًا لأنه يختبر asset/service-worker behavior لا توافق route نفسه.

## 8. Performance وCore Web Vitals smoke

تم التقاط navigation timing وFCP/LCP وresource weight بواسطة Playwright على النسخة المنشورة. هذه قياسات synthetic smoke وليست تقرير Lighthouse أو بيانات مستخدم حقيقي. القيم المرصودة:

| المشروع | responseStart | DOMContentLoaded | loadEvent | FCP | LCP | الموارد | transfer |
|---|---:|---:|---:|---:|---:|---:|---:|
| Chromium Desktop | 256ms | 672ms | 673ms | 952ms | 952ms | 15 | 9.51MB |
| Firefox Desktop | 33ms | 848ms | 1,024ms | 841ms | 841ms | 24 | 9.63MB |
| WebKit Desktop | 41ms | 364ms | 869ms | 498ms | 498ms | 15 | 9.51MB |
| Pixel 7 emulation | 26ms | 340ms | 785ms | 496ms | 496ms | 15 | 4.65MB |
| iPhone 13 emulation | 42ms | 376ms | 866ms | 537ms | 537ms | 15 | 4.65MB |

الزمن الملتقط تحت حدود smoke الموضوعة في الاختبار، لكن **حجم initial transfer مرتفع** خصوصًا desktop، ويستحق code splitting وimage/video optimization وفحصًا بـLighthouse على throttled mobile. لا ينبغي إعلان Core Web Vitals Pass اعتمادًا على هذه العينة وحدها؛ القياس القياسي يحتاج Lighthouse/CrUX أو RUM، مع تمييز LCP/INP/CLS حسب صفحة حقيقية.

## 9. UAT الحقيقي

لم يُنفذ UAT لأن الوكيل لا يستطيع اختلاق أشخاص حقيقيين أو اعتبار جلسات آلية دليلًا على قابلية الاستخدام البشرية. تم تجهيز `qa/UAT-script.md` ليُعطى للمشارك كما هو دون شرح مسبق، مع staging-only account وsandbox payment.

المعيار المقترح هو اختبار 5–8 مشاركين مستقلين: نجاح 80% على الأقل في إنشاء الحساب، بدء الاختبار، إرساله، قراءة النتيجة، والوصول إلى الباقات دون مساعدة؛ مع عدم وجود فقد للإجابات أو duplicate charge/result. يجب تسجيل الزمن، عدد طلبات المساعدة، الأخطاء، وفهم النتيجة، ثم اتخاذ قرار release بناءً على blockers لا على الانطباع العام فقط.

## 10. ما يجب إغلاقه قبل Release Approval

| الأولوية | الإجراء | سبب الحجب |
|---|---|---|
| P0 | توفير staging URL وcredentials مخصصة وsandbox payment/coupon | لإكمال التسجيل → quiz creation → solve → checkout → result/receipt آليًا |
| P0 | تنفيذ authorization matrix بحسابات anon/user A/user B/admin | لإثبات منع cross-user read/update وrole escalation لكل RPC حساس |
| P0 | تنفيذ UAT مع 5–8 أشخاص حقيقيين غير مُدرّبين | هذا مطلب قبول لا يمكن استبداله بـautomation |
| P1 | إعادة full QA matrix على Pages بعد انتشار `fe2e429` | تأكيد أن إصلاح touch target ظاهر live وليس محليًا فقط |
| P1 | اختبار API/Worker timeout و500/429 وpayment failure في staging | إثبات retry/idempotency وعدم النجاح الصامت |
| P1 | تفعيل leaked-password protection ومراجعة 109 authenticated SECURITY DEFINER | تقليل خطر إساءة RPC ورفع مستوى baseline الأمني |
| P1 | إضافة security headers عبر hosting/proxy مناسب | تقوية CSP/clickjacking/content-type/referrer defenses |
| P2 | تشغيل Lighthouse على صفحات landing/create/quiz/result تحت mobile throttling | تحويل performance smoke إلى قياس release-grade |
| P2 | اختبار Chrome Edge وSafari على أجهزة حقيقية | سد فجوة المحاكاة وChromium-as-Edge |

## 11. الملفات والأوامر القابلة لإعادة التشغيل

أضيفت الملفات `qa/playwright.qa.config.ts` و`qa/e2e/qa-suite.spec.ts` و`qa/run-security-scan.sh` و`qa/analyze-security-advisor.py` و`qa/UAT-script.md`. أوامر التشغيل هي:

```bash
pnpm qa:e2e
pnpm qa:perf
pnpm qa:security
pnpm test
pnpm typecheck
pnpm build
```

يستخدم `QA_BASE_URL` لتغيير البيئة، مثل `QA_BASE_URL=https://staging.example/ pnpm qa:e2e`. لا تُمرر credentials أو مفاتيح دفع حقيقية إلى الاختبارات، ولا تُشغّل stress production بمستويات 400 VU أو أكثر دون موافقة صريحة ونافذة مراقبة.

## References

[1]: https://owasp.org/Top10/ "OWASP Top 10"
[2]: https://web.dev/articles/vitals "Web Vitals — web.dev"
[3]: https://supabase.com/docs/guides/database/database-linter "Supabase Database Linter"
[4]: https://supabase.com/docs/guides/auth/password-security "Supabase password strength and leaked-password protection"
[5]: https://www.w3.org/TR/WCAG22/#target-size-minimum "WCAG 2.2 — Target Size (Minimum)"
