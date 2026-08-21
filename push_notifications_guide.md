# دليل ربط إشعارات التحديثات الفورية (Push Notifications) في Quiz Space

تتيح خدمة الإشعارات الفورية (Push Notifications) تنبيه مستخدمي تطبيق **Quiz Space** على هواتفهم الذكية فور توفر إصدار جديد أو ميزات مهمة.

---

## 1. المعمارية الهندسية للإشعارات في التطبيق

1. **تسجيل الأجهزة (Device Registration)**:
   - عند فتح المستخدم لتطبيق Android وتسجيل الدخول، يقوم التطبيق بطلب صلاحية الإشعارات وتوليد رمز تسجيلي آمن عبر Web Push (أو Firebase Cloud Messaging عند تفعيل المشروع الهندسي بالكامل).
   - يتم تخزين هذا الرمز المرتبط بمعرّف المستخدم في قاعدة بيانات Supabase (جدول `push_subscriptions`).

2. **التحقق من التحديثات وإرسال التنبيه**:
   - يعتمد التطبيق على فحص ملف `update.json` المنشور على GitHub بشكل دوري أو عند فتح التطبيق.
   - لإرسال إشعار فوري عند نشر تحديث جديد (مثل الإصدار `v1.1.2`)، يمكن استخدام سكريبت خادم محمي (Node.js/Supabase Edge Function) يقرأ الرموز المسجلة ويرسل تنبيهًا جماعيًا (`Title: تحديث جديد لـ Quiz Space`، `Body: الإصدار 1.1.2 متاح الآن للتنزيل`).

---

## 2. خطوات تفعيل الإشعارات الفورية عمليًا

### أ. إنشاء جدول تخزين الرموز في Supabase
قم بتنفيذ الأمر التالي في لوحة تحكم Supabase SQL لتخزين اشتراكات الإشعارات بأمان:
```sql
create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  subscription jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid()::text = user_id or user_id = 'admin');
```

### ب. تشغيل طلب الصلاحية داخل التطبيق
في ملف `pushManager.ts` الحالي، يتم استدعاء `registerPushNotifications(userId)` بعد نجاح تسجيل دخول المستخدم، حيث يظهر تنبيه النظام لطلب الموافقة على استقبال التنبيهات.

### ج. إرسال إشعار الإصدار الجديد
عند نشر إصدار APK جديد (مثل `v1.1.2` على Google Drive و تحديث `update.json`)، يمكنك تشغيل سكريبت إرسال الإشعارات للخادم لقراءة الاشتراكات وإرسال التنبيه الفوري لكل جهاز مسجل.

---

## 3. الاعتبارات الأمنية (Security & Backend Guard)
- **عدم كشف الأسرار**: لا تقم أبدًا بتضمين مفاتيح خادم الإشعارات السرية (VAPID Private Key أو Firebase Server Key) داخل كود الواجهة الأمامية أو ملفات APK الخاصة بالعميل.
- **حماية قواعد البيانات**: تأكد دائمًا من تفعيل سياسات RLS على جداول الاشتراكات بحيث لا يستطيع أي مستخدم قراءة اشتراكات المستخدمين الآخرين.
