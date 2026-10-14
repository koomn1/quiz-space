# Quiz Space — تدقيق نظام Cosmo AI وخطة التطوير

**نوع العمل:** تدقيق read-only ووضع بنية وخطة، بدون تعديل كود أو مخطط قاعدة البيانات.

**المستودع:** `koomn1/quiz-space`

**المشروع الحي الذي تمت مراجعته:** Supabase `eqfrxrsstatryaetgerw` — `quiz space` — الحالة أثناء التدقيق: `ACTIVE_HEALTHY`.

## 1. الخلاصة التنفيذية

المنصة لديها نواة مفيدة بالفعل، لكنها ليست بعد نظام محادثات وملفات وذاكرة متكاملًا بالمواصفات المطلوبة.

الموجود فعلاً:

- حسابات Supabase Auth مع جلسات محفوظة وتجديد تلقائي.
- محادثات Cosmo محفوظة في Supabase للمستخدم المسجل، مع fallback محلي في `localStorage`.
- جدولان للمحادثات والرسائل مع RLS خاص بالمالك.
- Worker منفصل يتحقق من Bearer token عبر Supabase Auth، مع fallback خاص بتكامل تطبيق الهاتف.
- رفع ملفات خاص مؤقت مرتبط بـ `extraction_jobs`، مع Storage bucket خاص، حد 12 MB، وRLS للمسار الذي يبدأ بمعرّف المستخدم.
- معالجة PDF وDOCX وTXT/Markdown وXLSX وPPTX، ومسار رؤية للصور وPDF عند الحاجة.
- طوابير/وظائف استخراج قابلة للاستئناف مع idempotency ومؤشرات تقدم.

غير الموجود أو غير مكتمل:

- لا توجد طبقة مرفقات دائمة مرتبطة برسائل المحادثة، ولا مكتبة ملفات للمستخدم.
- الرسائل المخزنة نص فقط مع `had_image`؛ لا يوجد مصدر/ملف/عملية معالجة مرتبطة بالرسالة.
- لا يوجد بحث في المحادثات أو الملفات داخل صلاحيات المستخدم.
- لا توجد ذاكرة مستمرة اختيارية قابلة للمشاهدة والتعديل والحذف والإيقاف.
- لا توجد أرشفة أو استعادة محادثات أو سلة محذوفات.
- مزامنة المحادثات الحالية ليست conflict-safe: لا توجد versioning أو cursor sync أو idempotent message keys أو معالجة تعارض متعددة الأجهزة.
- الفشل في بعض عمليات الحفظ يتم تسجيله في console فقط، وقد يرى المستخدم واجهة ناجحة دون ضمان أن الحفظ البعيد تم.
- OCR المخصص للوثائق/الصور المصورة غير موجود كمسار مستقل موثق؛ الصور ترسل للرؤية، وPDF غير النصي يعتمد على fallback للمزود.
- أوضاع AI المطلوبة ليست طبقة صلاحيات/مصادر موحدة مستقلة؛ توجد مسارات AI متعددة، لكن لا توجد سياسة بيانات صريحة لكل وضع.
- التدقيق الحي أظهر تحذيرات أمنية في Supabase يجب فرزها قبل توسعة نظام البيانات الحساسة.

**القرار المقترح:** لا نضيف جداول عشوائية أو نعيد بناء `cosmo_conversations` و`cosmo_messages`. نحتفظ بهما، ثم نضيف طبقات attachments, processing, memory, search, sync metadata، ونحوّل الكتابات الحساسة إلى API/RPC موحدة بعد مراجعة RLS.

---

## 2. ما تم فحصه فعلياً

### المستودع والكود

- `src/pages/AIChat.tsx`
- `src/lib/db.ts`
- `src/lib/supabaseClient.ts`
- `src/services/aiWorkerClient.ts`
- `worker/src/auth.ts`
- `worker/src/index.ts`
- `worker/src/extractionRoutes.ts`
- `worker/src/extractionJobs.ts`
- `worker/src/documentExtraction.ts`
- `worker/src/attachmentPipeline.ts`
- اختبارات Cosmo واستخراج الملفات.

### قاعدة البيانات الحية

- `list_projects`: تحديد مشروع `quiz space` النشط.
- `list_tables` مع الأعمدة والعلاقات لـ `public` و`storage`.
- `list_migrations`: التحقق من المigrations المطبقة فعلاً حتى `20261014171329`.
- Supabase Security Advisors.
- Supabase Performance Advisors.

لم يتم تنفيذ أي DDL أو DML أو تعديل صلاحيات أثناء هذا التدقيق.

---

## 3. الحالة الحالية بالتفصيل

### 3.1 تسجيل الدخول والهوية

- العميل يستخدم Supabase Auth مع `persistSession: true` و`autoRefreshToken: true`.
- الواجهة لا تضع service-role key داخل bundle؛ تستخدم anon/publishable client configuration.
- Worker يستخرج المستخدم من `Authorization: Bearer ...` عبر `/auth/v1/user`.
- يوجد fallback لـ mobile Firebase session عبر `mobile-firebase-session-v2`.
- الحساب والباقة يتم جلبهما من الخادم، وليس من قيمة واجهة يثق بها الـ Worker.

**الحكم:** الأساس جيد، لكن يجب توحيد `auth.uid()` كهوية وحيدة لكل العمليات الجديدة، وعدم قبول `userId` القادم من العميل كمصدر صلاحية.

### 3.2 المحادثات الحالية

الجداول الموجودة فعلاً:

- `public.cosmo_conversations`
  - `id text primary key`
  - `user_id text` مرتبط بـ `public.users(uid)`
  - `title`, `created_at`, `updated_at`
- `public.cosmo_messages`
  - `id text primary key`
  - `user_id text`
  - `conversation_id` مع cascade delete
  - `role` = `user | cosmo`
  - `text`
  - `had_image`
  - `created_at`

السياسات الحالية:

- قراءة/تعديل/حذف المحادثات للمالك فقط.
- إدخال الرسائل يشترط أن يساوي `user_id` قيمة `auth.uid()`، وأن تكون المحادثة مملوكة للمستخدم.
- قراءة/حذف الرسائل للمالك فقط.
- لا توجد صلاحية `UPDATE` للرسائل، وهو مناسب لجعل الرسالة immutable، لكن يحتاج إلى سياسة تصحيح/مزامنة واضحة بدلاً من الاعتماد على الإدخال المتكرر.

سلوك العميل الحالي:

- يحمّل التاريخ البعيد أولاً عند وجود المستخدم، ويستخدم localStorage كـ fallback.
- إذا وُجد remote history، يتم تفضيله على المحلي بدلاً من عمل merge موجه بالمعرّفات.
- المحادثة الجديدة لها id مولد من العميل (`conv-...`).
- الرسائل تحفظ بعد ظهور الرد أو في نقاط منفصلة، وتُسجل أخطاء الحفظ في console دون حالة حفظ واضحة للمستخدم.
- إعادة التسمية والحذف يرسلان mutation بالـ id؛ RLS يحمي الوصول، لكن الدوال لا تعيد فشلًا واجهياً موثوقاً ولا يوجد archive/restore.
- لا يوجد بحث SQL/FTS في المحادثات.

**النتيجة:** يوجد حفظ بعيد حقيقي، لذلك تغيير الجهاز ممكن من حيث المبدأ، لكنه ليس بعد مزامنة موثوقة متعددة الأجهزة.

### 3.3 رفع الملفات ومعالجتها

المسارات الحالية:

1. المرفقات الصغيرة في Cosmo يمكن أن تذهب مباشرة إلى Worker كـ base64.
2. الملفات الكبيرة للمستخدم المسجل تمر عبر `createExtractionJob`.
3. يتم رفع الملف إلى bucket خاص `quiz-extraction-uploads`.
4. المسار يبدأ بـ `user.id/random-id/safe-file-name`.
5. يتم إنشاء job بمفتاح idempotency.
6. Worker يعالج الملف على دفعات عبر Queue/worker task ledger.
7. النتيجة تحفظ كـ structured quiz/extraction metadata، لا كخام bytes داخل الجدول.
8. المسار يدعم polling، حالات progress، retry/control، وإعادة الاستئناف المحلية عبر job id.

حدود ومخاطر حالية:

- الحد الحالي 12 MB.
- bucket الخاص يسمح PDF وOffice وTXT/Markdown وJPEG/PNG/WebP.
- لا توجد مكتبة ملفات دائمة أو سجل attachment metadata عام يربط الملف بالرسالة والمحادثة.
- لا توجد جداول `file_assets`, `message_attachments`, `extraction_runs` مستقلة.
- حذف المصدر بعد المعالجة مذكور في المخطط، لكن لا يوجد في النواة الحالية منتج مكتبة يمكن للمستخدم إدارة retention الخاص به.
- لا توجد خدمة OCR مستقلة موثقة للصور/الـ PDF المصور؛ الرؤية/fallback ليست نتيجة OCR قابلة للبحث أو المراجعة.
- التحقق الحالي يعتمد MIME والامتداد ومسار parser؛ يلزم إضافة فحص magic bytes/تعقيم اسم الملف/حصص المستخدم ومراقبة استخدام التخزين.

### 3.4 الذاكرة

لم يظهر في الكود أو المخطط الحالي جدول ذاكرة مستمر أو إعدادات ذاكرة.

الموجود هو:

- آخر عدد محدود من رسائل المحادثة يمرر كسياق.
- `localStorage` للمحادثات والمسودات وبعض معرفات الوظائف.
- سياق حساب/صفحة موثق من الخادم.

غير موجود:

- memory items قابلة للمشاهدة والتعديل والحذف.
- memory setting per user أو per conversation.
- تصنيف الحساسية ومنع التخزين التلقائي للمعلومات الحساسة.
- سجل مصدر الذاكرة وسبب إنشائها وتاريخ حذفها.

### 3.5 البحث والمصادر

- يوجد web search لمسار البحث الخارجي في Cosmo.
- لا يوجد بحث موحد في `cosmo_messages` أو الملفات المستخرجة.
- لا يوجد فهرس FTS أو vector index خاص ببيانات المستخدم.
- لا يوجد عرض مصدر/رسالة/ملف في نتيجة بحث داخلي.
- لا توجد سياسة حذف متزامنة لفهرس متجهي لأن الفهرس الداخلي غير موجود بعد.

### 3.6 أوضاع الذكاء الاصطناعي

توجد مسارات توليد ومراجعة واستخراج وCosmo، لكن لم يظهر abstraction موحد يعرّف لكل وضع:

- البيانات المسموح قراءتها.
- هل يستطيع قراءة الذاكرة؟
- هل يستطيع قراءة المرفق الحالي؟
- هل يستخدم web search؟
- ما مصادر الإجابة التي يجب عرضها؟
- ما الذي يحدث عند عدم اكتمال القراءة؟

لذلك يجب تصميم `mode policy` قبل إضافة الأوضاع السبعة المطلوبة، بدلاً من ربط كل وضع مباشرة بمزود مختلف.

---

## 4. ملاحظات الأمان من المشروع الحي

### إيجابي

- RLS موجود على جداول المحادثات والرسائل وextraction jobs.
- Storage bucket الخاص بالاستخراج غير public.
- سياسات Storage تقصر المسار على أول جزء يساوي `auth.uid()`.
- Worker يتحقق من جلسة المستخدم بدلاً من الثقة في user id مرسل فقط.
- migration حديثة أضافت chat objects المفقودة إلى المخطط المتتبع، والمشروع الحي طبقها فعلاً.

### يحتاج معالجة قبل إطلاق نظام الخصوصية الكامل

Supabase Security Advisors أظهر:

- جدولين RLS مفعّل عليهما بدون policies:
  - `public.guest_quiz_attempts`
  - `public.web_vitals`
- أربع دوال ذات `search_path` قابل للتغيير:
  - `is_classroom_student_member`
  - `is_classroom_owner`
  - `touch_quiz_error_bank_updated_at`
  - `effective_membership_active`
- تحذيرات كثيرة لدوال `SECURITY DEFINER` قابلة للتنفيذ من `anon` أو `authenticated`.
  - بعضها مقصود كـ public RPC، وبعضها إداري أو حساس ويحتاج مراجعة grants.
  - لا يجوز اعتبار العدد وحده ثغرة؛ المطلوب تصنيف كل function إلى public-safe / authenticated-safe / admin-only / server-only ثم ضبط `REVOKE/GRANT` والـ argument checks.
- Performance Advisors أظهر foreign keys غير مفهرسة، وكثيراً من سياسات RLS التي تعيد `auth.<function>()` لكل صف بدلاً من `(select auth.<function>())`.

روابط Supabase التي ظهرت في النتائج:

- [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008)
- [Mutable function search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011)
- [SECURITY DEFINER executable by anon](https://supabase.com/docs/guides/database/database-linter?lint=0028)
- [SECURITY DEFINER executable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029)
- [Unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001)
- [Auth RLS init plan](https://supabase.com/docs/guides/database/database-linter?lint=0003)

**ملاحظة مهمة:** لم يتم تغيير أي policy أثناء التدقيق لأن الطلب كان طلب مخطط وفحص أولي، وليس موافقة على migration أمنية.

---

## 5. البنية المقترحة

### 5.1 الجداول والعلاقات

نحتفظ بالجداول الحالية ونضيف:

```text
users
  └── conversations
        ├── messages
        │     └── message_attachments ── file_assets
        ├── conversation_members (اختياري، يؤجل حتى مشاركة المحادثات)
        └── sync_events / message_versions

file_assets
  ├── extraction_runs
  │     └── extraction_chunks
  └── file_search_documents / file_search_chunks

users
  ├── memory_settings
  └── memory_items
```

#### conversations — توسيع الجدول الحالي

- `archived_at`
- `deleted_at` أو `purged_at` وفق سياسة retention
- `last_message_at`
- `client_created_at`
- `version` أو `updated_sequence`
- `sync_token`/`last_server_sequence` إن احتجنا protocol صريحاً
- `title_source` (`user`, `ai`, `default`)
- `title_generated_at`

#### messages — توسيع الجدول الحالي

- `client_message_id` unique per user/conversation للـ idempotency
- `parent_message_id` عند الحاجة
- `status` (`pending`, `sent`, `failed`, `deleted`)
- `mode`
- `source_summary` أو JSON محدود للمصادر
- `created_by_device_id` اختياري
- `server_sequence` للمزامنة المرتبة
- `metadata` JSONB غير حساس ومحدود الحجم

يفضل عدم تعديل الرسالة بعد إنشائها؛ الإصلاح يكون برسالة event/version أو soft delete.

#### file_assets

- `id uuid`
- `owner_user_id uuid/text` مرتبط بـ auth identity
- `conversation_id text null`
- `original_name`
- `sanitized_name`
- `declared_mime`
- `detected_mime`
- `size_bytes`
- `sha256`
- `storage_bucket`
- `storage_path`
- `status` (`uploaded`, `scanning`, `extracting`, `ready`, `failed`, `deleted`, `expired`)
- `retention_expires_at`
- `created_at`, `deleted_at`
- `error_code` غير حساس

Raw bytes لا تُخزن في Postgres ولا تُجعل public.

#### message_attachments

جدول ربط يثبت أن الملف استُخدم في رسالة/طلب معيّن:

- `message_id`
- `file_asset_id`
- `purpose` (`context`, `quiz_source`, `image_input`)
- `ordinal`
- unique على `(message_id, file_asset_id, purpose)`

#### extraction_runs / chunks

- run مرتبط بملف وبمستخدمه.
- `parser`, `ocr_provider`, `provider`, `status`, `progress`, `warnings`.
- chunks تخزن النص المستخرج فقط عند تفعيل retention المناسب، مع حدود طول واضحة.
- كل chunk يحمل `file_asset_id`, `run_id`, `ordinal`, `char_range/page_number`.

#### memory_settings / memory_items

- الإعدادات الافتراضية: memory off أو opt-in بحسب قرار المنتج.
- `memory_settings`: enabled, auto_capture_enabled, sensitive_capture_disabled, retention_days.
- `memory_items`: user_id, category, content, source_message_id, confidence, status, created_at, updated_at, deleted_at.
- منع categories حساسة تلقائياً: كلمات مرور، رموز، بطاقات دفع، وثائق هوية، بيانات صحية/قانونية شديدة الحساسية، إلا إذا أدخلها المستخدم صراحة كذاكرة قابلة للحفظ.

#### البحث

المرحلة الأولى الأفضل: Postgres FTS على محتوى المحادثة والمستندات مع metadata owner_id.

المرحلة الثانية اختيارية: pgvector أو خدمة بحث متجهية، بشرط:

- owner/user scope في metadata.
- filter إجباري بالمالك قبل similarity search.
- حذف/تحديث vector عند حذف المصدر أو إخفائه.
- عدم إرسال نتائج من فهرس مشترك إلى مستخدم آخر.

---

## 6. تدفق البيانات المقترح

### 6.1 رسالة بدون ملف

1. العميل يحصل على session صالحة.
2. العميل ينشئ/يستعمل conversation عبر API موحد.
3. يرسل `client_message_id`, النص، mode، وdevice/session metadata غير الحساسة.
4. الخادم يتحقق من `auth.uid()`، conversation ownership، limits، وidempotency.
5. الرسالة تحفظ قبل استدعاء المزود بحالة `pending`.
6. يقرأ الخادم آخر سياق مسموح فقط، والذاكرة المفعلة فقط.
7. يستدعي مزود AI، ويسجل status وprovider/usage metadata دون أسرار أو raw sensitive prompts غير الضرورية.
8. يحفظ رد Cosmo كرسالة immutable مرتبطة بنفس conversation.
9. يرسل ACK/stream مع `server_sequence`.
10. الأجهزة الأخرى تحصل على delta منذ آخر cursor.

### 6.2 رسالة مع ملف

1. العميل يطلب upload session أو يرفع إلى private Storage path صادر من الخادم.
2. الخادم يثبت user ownership، الحجم، الامتداد، MIME الفعلي، checksum، والـ quota.
3. ينشأ `file_asset` بحالة `uploaded`، ثم `extraction_run`.
4. يعالج Worker الملف: parser للنص/Office، PDF text extraction، OCR عند توفره، Vision للصور.
5. كل نتيجة ترتبط بـ `file_asset` و`conversation_id` و`message_id` ولا تخلط مع مستخدم آخر.
6. بعد `ready`, ينفذ AI mode request مع النص/المقاطع المسموح بها فقط.
7. الرسالة والملف والمصادر تسجل كمراجع قابلة للعرض.
8. عند الفشل، يبقى status قابلًا لإعادة المحاولة دون إعادة duplicate upload.
9. عند الحذف، يمنع البحث والـ AI من استخدام الملف فوراً، ثم يحذف storage/chunks/vectors حسب retention.

### 6.3 المزامنة بين جهازين

- لكل رسالة `client_message_id` ثابت أثناء retry.
- الخادم يرجع ACK واضحاً: `accepted`, `duplicate`, `conflict`, `rejected`.
- كل جهاز يحتفظ بـ `last_server_sequence` لكل conversation.
- sync endpoint يعيد deltas فقط مع pagination.
- لا يستخدم النظام localStorage كمرجع نهائي؛ هو cache/offline queue فقط.
- عند التعارض:
  - الرسائل الجديدة immutable، لذلك غالباً merge append آمن.
  - rename/archive يستخدم version check أو last-write-wins موثقاً.
  - delete/restore يستخدم tombstone وserver authority.

---

## 7. الصلاحيات المطلوبة

### العميل

- لا يرسل `owner_user_id` ليحدد صلاحية؛ الخادم يشتقه من session.
- لا يقرأ إلا conversation/file/message حيث `owner_id = auth.uid()` أو membership policy معتمدة لاحقاً.
- لا يحصل على raw storage URL دائم؛ يستخدم signed URL قصير العمر عند الحاجة.
- لا يرى أسماء/محتوى/حالة ملفات مستخدمين آخرين حتى في search أو errors.

### Worker/API

- يتحقق من session في كل endpoint حساس.
- يرفض guest للذاكرة، المزامنة، والمكتبة الدائمة للملفات إلا إذا صُمم مسار guest منفصل صراحة.
- لا يثق في client-supplied user id أو role أو plan.
- يحد كل endpoint rate/size/time/rows.
- لا يسجل raw file bytes أو authorization headers أو prompts الحساسة في logs.

### Database/RLS

- كل جدول جديد يحتوي owner key واضحاً وفهرساً عليه.
- policies منفصلة لـ SELECT/INSERT/UPDATE/DELETE.
- `WITH CHECK` يمنع تبديل المالك في UPDATE.
- message attachment policy تتحقق من ownership على طرفي العلاقة.
- `SECURITY DEFINER` فقط للعمليات التي تحتاجها، مع `SET search_path`, grants دقيقة، والتحقق من actor داخلياً.
- deletion يستخدم soft delete/tombstone ثم purge worker، وليس حذفاً غير قابل للتدقيق مباشرة في كل مكان.

---

## 8. أوضاع AI المقترحة

ينبغي أن يتلقى كل طلب `mode` موحداً وسياسة مصدر:

| الوضع | الذاكرة | الملفات الحالية | البحث الخارجي | مصادر مطلوبة |
|---|---:|---:|---:|---:|
| Instant | اختياري وفق الإعداد | نعم، بعد نجاح المعالجة | لا | مصدر الملف إن استُخدم |
| Thinking | اختياري | نعم | لا | ملخص مصادر |
| Search | لا يقرأ ذاكرة حساسة تلقائياً | نعم عند الطلب | نعم | روابط البحث + الملف |
| Deep Research | فقط ما سمح به المستخدم | نعم | نعم | سجل مصادر كامل |
| Study | ذاكرة دراسة اختيارية | نعم | لا افتراضياً | صفحات/مقاطع المصدر |
| Problem Solving | لا يخزن تلقائياً | نعم | لا افتراضياً | خطوات الحل/المصدر |
| Creation | لا يخزن تلقائياً | نعم كمرجع | لا افتراضياً | يوضح أن الناتج مولد |
| Analysis | ذاكرة opt-in فقط | نعم | حسب policy | مصدر البيانات والحدود |

قواعد عامة:

- لا يقال “قرأت الملف” إلا إذا `extraction_run.status = ready` أو provider أقرّ باستلام رؤية الملف.
- عند فشل OCR أو parser تظهر الحالة للمستخدم ولا يتم التخمين.
- الرد يحتفظ بمراجع `source_id`, `message_id`, `file_asset_id`, page/chunk عند توفرها.

---

## 9. الخدمات الخارجية المطلوبة

### موجودة بالفعل

- Supabase Auth.
- Supabase Postgres + RLS.
- Supabase Storage الخاص.
- Cloudflare Worker/Queue لمعالجة الخلفية.
- AI providers الحالية عبر Worker، مع Groq/OpenRouter ومسارات vision حسب الإعداد.

### مطلوبة أو اختيارية حسب القرار

1. **OCR حقيقي للصور وPDF المصور**: يجب اختيار مزود فعلي وتوثيق التكلفة والحدود. حالياً لا يوجد OCR مستقل قابل للبحث والتتبع في schema.
2. **بحث داخلي**: يمكن البدء بـ Postgres FTS دون خدمة جديدة؛ vector search يحتاج pgvector أو مزود vector خارجي.
3. **مراقبة/تنبيهات**: اختيارياً Sentry/Logflare/خدمة observability، مع منع تسريب المحتوى.
4. **حذف/retention scheduler**: يمكن تنفيذه في Cloudflare scheduled Worker أو Supabase cron/Edge Function.

لا يجب إضافة خدمة خارجية قبل تثبيت حدود الخصوصية، retention، data processing agreement، ومنع استخدام المحتوى للتدريب دون أساس وموافقة مناسبة.

---

## 10. خطة التنفيذ المقترحة

### المرحلة 0 — تثبيت الأمن والعقود

- جرد كل policies وRPC grants في المشروع الحي.
- إصلاح/تصنيف advisories الحرجة، خصوصاً RLS بلا policies وSECURITY DEFINER grants.
- إضافة tests لتغيير معرفات المستخدم/المحادثة/الملف.
- توحيد auth identity في Worker وDB.
- تحديد سياسة الاحتفاظ والحذف وموافقة الذاكرة.

### المرحلة 1 — محادثات ومزامنة موثوقة

- إضافة client idempotency وserver sequence/message status.
- حفظ الرسالة pending قبل AI call، ثم تحديث النتيجة عبر event/status.
- sync cursor + pagination + retry queue.
- merge remote/local بدلاً من remote-or-local.
- archive/restore/tombstone.
- العنوان التلقائي مع fallback deterministic، وإعادة التسمية.
- بحث FTS أولي في المحادثات.

### المرحلة 2 — ملفات دائمة وآمنة

- `file_assets` و`message_attachments`.
- upload session، checksum، detected MIME، quotas.
- status machine للرفع والمعالجة والفشل وإعادة المحاولة.
- signed URLs قصيرة العمر.
- file library اختيارية مع حذف/استعادة حسب retention.
- ربط حقيقي بالرسالة والمحادثة.

### المرحلة 3 — الاستخراج وOCR والمصادر

- extraction runs/chunks.
- OCR provider adapter مع بديل واضح.
- منع استخدام source غير جاهز.
- source citations في ردود AI.
- تنظيف storage/chunks عند الحذف أو انتهاء retention.

### المرحلة 4 — الذاكرة الاختيارية

- memory settings UI.
- memory item CRUD وعرض المصدر.
- opt-in/disable/forget all.
- sensitive data filters.
- اختبارات عدم استخدام الذاكرة عند إيقافها.

### المرحلة 5 — أوضاع AI والبحث

- mode policy registry.
- FTS ثم vector اختياري.
- filter owner/membership في كل query.
- citations وprovider trace آمن.

### المرحلة 6 — تجربة المستخدم والاختبارات النهائية

- responsive conversation list.
- حالات save/upload/process/offline/session-expired/quota.
- device sync E2E.
- security tests باستخدام مستخدمين مختلفين.
- chaos/retry tests للرفع والمعالجة والمزامنة.

---

## 11. خطة الاختبارات المطلوبة

### ما تم فعله في هذا التدقيق

- فحص بنية المستودع والكود ذي الصلة.
- فحص الجداول الحية والأعمدة والعلاقات.
- فحص migrations المطبقة.
- فحص Supabase Security Advisors وPerformance Advisors.
- مراجعة سياسات RLS الخاصة بالمحادثات وملفات extraction.

### لم يُنفذ بعد، ولا ينبغي ادعاء اكتماله

| الاختبار | الحالة | المطلوب قبل اعتبار النظام مكتملاً |
|---|---|---|
| تسجيل مستخدم A وإنشاء محادثة | لم يُنفذ في هذا التدقيق | جهازان/جلسة حقيقية |
| تسجيل جهاز B بالحساب نفسه واستعادة الرسائل | لم يُنفذ | تحقق من delta/no duplicate |
| مستخدم B يغير conversation id | لم يُنفذ | 0 rows/403 عبر RLS/API |
| رفع PDF نصي وفتحه من جهاز آخر | لم يُنفذ | private object + source ready |
| رفع PDF مصور/صورة | لم يُنفذ | OCR/vision result موثق |
| DOCX/XLSX/PPTX/TXT | لم يُنفذ end-to-end | MIME فعلي + parser result |
| ملف unsupported/حجم زائد | لم يُنفذ | رفض قبل التخزين ورسالة واضحة |
| انقطاع الشبكة أثناء upload | لم يُنفذ | retry/idempotency/cleanup |
| انقطاع الشبكة أثناء save message | لم يُنفذ | outbox/retry/no duplicate |
| حذف واستعادة محادثة | غير متاح حالياً كميزة كاملة | implement ثم test tombstone |
| بحث رسائل وملفات | غير موجود حالياً | FTS/vector + owner filter |
| إيقاف الذاكرة | غير موجود حالياً | memory off test |
| حذف ملف وتنظيف الفهرس | غير موجود حالياً | storage/chunks/vectors purge |
| RLS adversarial tests | جزئي عبر migration review فقط | test users A/B + direct REST/RPC |

---

## 12. قرارات نحتاجها قبل كتابة migrations أو الكود

1. هل الذاكرة **opt-in من البداية** أم enabled مع زر إيقاف واضح؟ التوصية: opt-in للذاكرة المستمرة.
2. ما مدة retention للملفات الخام: حذف بعد المعالجة، أم مكتبة ملفات يحتفظ بها المستخدم؟
3. هل نحتاج مشاركة محادثات مع مستخدمين آخرين في هذه المرحلة؟ التوصية: لا؛ owner-only أولاً.
4. ما مزود OCR المعتمد للصور/PDF المصور؟ يجب تحديده قبل تصميم `extraction_runs` النهائي.
5. هل نبدأ بـ Postgres FTS أم نحتاج vector search من الإصدار الأول؟ التوصية: FTS أولاً.
6. هل يسمح الضيف بمحادثات مؤقتة فقط دون sync/file library/memory؟ التوصية: نعم.
7. ما حدود الحصة لكل خطة: عدد المحادثات، حجم التخزين، عدد الملفات، مدة الاحتفاظ، وAI processing quota؟
8. ما سياسة حذف الحساب: soft delete، grace period، ثم purge نهائي؟
9. ما الحد الأقصى لسجل المحادثة الذي يرسل إلى المزود، وما البيانات التي يجوز تسجيلها في telemetry؟

## التوصية النهائية

ابدأ بالمرحلتين 0 و1 قبل أي تحسين بصري كبير. السبب أن الواجهة الحالية قادرة على إظهار محادثة ورفع ملف، لكن الضمانات المطلوبة — المزامنة الحقيقية، الارتباط الدائم للمرفق، الذاكرة القابلة للتحكم، والبحث العازل — تحتاج عقود بيانات وصلاحيات أولاً. بعد اعتماد القرارات التسعة أعلاه يمكن تحويل الخطة إلى migrations صغيرة قابلة للمراجعة، ثم تنفيذها واختبارها على Supabase branch قبل الإنتاج.
