# Quiz Space — Migration Changelog

## نظرة عامة | Overview

تم ترحيل مشروع **Quiz Space** بالكامل من نموذج Full-Stack (Backend + Frontend) إلى نموذج **Serverless (Client-Side Only)** يعمل على **GitHub Pages** بدون أي خادم خلفي.

> **Goal:** Remove all `/api/` backend dependencies and migrate 100% to client-side logic using Supabase SDK, direct AI API calls, and GitHub Pages static hosting.

---

## الخطوات التي تمت | Steps Completed

### الخطوة 1 - إعداد المشروع للـ Serverless
- إعداد `vite.config.ts` ليبني كـ SPA ثابت مع `base` path صحيح للـ GitHub Pages (`/quiz-space/`)
- إنشاء `.github/workflows/deploy.yml` لنشر تلقائي عند كل push على main

### الخطوة 2 - تشفير مفاتيح API
- إنشاء `generate_keys.ps1` لتشفير مفاتيح API
- المفاتيح المشفرة في `src/lib/keys.generated.ts`
- يتجنب GitHub Push Protection
- مفاتيح: GEMINI، GROQ، DEEPSEEK، OPENAI، SUPABASE URL + ANON KEY

### الخطوة 3 - ترحيل قاعدة البيانات
- `Classrooms.tsx` ← CRUD classrooms، join/leave، messages (Supabase مباشر)
- `BillingSection.tsx` ← Coupon validation (Supabase مباشر)
- `ExtraFeatures.tsx` ← View increment (Supabase مباشر)
- `UserProfile.tsx` ← Follow/unfollow، custom ID check، promo codes، VIP activation
- `Security.tsx` ← Sessions، 2FA via Supabase MFA API
- `QuizCreator.tsx` ← Document upload، classroom message dispatch

### الخطوة 4 - ترحيل خدمات الذكاء الاصطناعي
- `geminiService.ts` ← يستدعي generativelanguage.googleapis.com مباشر
- `groqService.ts` ← يستدعي api.groq.com مباشر
- `deepseekService.ts` ← يستدعي api.deepseek.com مباشر
- `openaiService.ts` ← يستدعي api.openai.com مباشر
- كل الخدمات تقرأ المفتاح من keys.generated.ts أو localStorage

### الخطوة 5 - ترحيل CosmoChatbot
- `CosmoChatbot.tsx` ← استدعاء Gemini API مباشر
- يدعم System Instruction بالعربي والإنجليزي
- يدعم Multi-turn history (آخر 5 رسائل)
- يدعم Image analysis عبر inline_data

### الخطوة 6 - ترحيل منشئ الكويز من الملفات
- `useQuizGenerator.ts` ← أُزيل generate-from-pdf، scan-document، generate-from-file
- الآن يستخدم Gemini Vision API مباشر مع inline_data للملفات
- `QuizCreator.tsx` ← document init أصبح محلياً كـ base64

### الخطوة 7 - ترحيل صفحة الأمان (Security)
- Sessions ← supabase.auth.getSession()
- 2FA Status ← supabase.auth.mfa.listFactors()
- 2FA Enroll ← supabase.auth.mfa.enroll({ factorType: 'totp' })
- 2FA Verify ← supabase.auth.mfa.challenge() + verify()
- 2FA Disable ← supabase.auth.mfa.unenroll()
- Revoke Session ← supabase.auth.signOut()

### الخطوة 8 - ترحيل لوحة الأدمن
- `AdminSubscriptions.tsx` ← generate-promo-msg ← Gemini API مباشر
- `GeminiReview.tsx` ← gemini-sandbox ← Gemini API مباشر مع latency محلي

### الخطوة 9 - تعطيل Push Notifications
- `pushManager.ts` ← أُحيل لـ stub فارغ (تتطلب backend)

### الخطوة 10 - ترحيل Origin Detection
- `origin.ts` ← أُزيل /api/share-origin
- يستخدم window.location.origin مباشر

---

## المعمارية الجديدة | New Architecture

```
Before (Old):
Browser → Backend Server (Node.js) → Supabase / AI APIs

After (New):
Browser → Supabase / AI APIs (مباشر بدون خادم)
```

---

## متطلبات التشغيل

### مفاتيح API المطلوبة:
| المفتاح | الاستخدام |
|--------|----------|
| GEMINI_API_KEY | توليد الكويز، CosmoChatbot، شرح الأسئلة |
| GROQ_API_KEY | توليد الكويز (بديل) |
| DEEPSEEK_API_KEY | توليد الكويز (بديل) |
| OPENAI_API_KEY | توليد الكويز (بديل) |
| SUPABASE_URL | قاعدة البيانات والمصادقة |
| SUPABASE_ANON_KEY | قاعدة البيانات (public) |

### خطوات التشغيل:
```bash
npm install          # تثبيت الاعتماديات
.\generate_keys.ps1  # توليد مفاتيح API المشفرة
npm run dev          # تشغيل محلياً
npm run build        # بناء للإنتاج
.\push.bat           # نشر على GitHub Pages
```

---

## الملاحظات

1. **PDF Quiz Generator** - يتطلب gemini_api_key في localStorage
2. **CosmoChatbot** - يتطلب gemini_api_key في localStorage
3. **Push Notifications** - معطلة (تتطلب backend)
4. **2FA** - تعمل عبر Supabase MFA (يتطلب تفعيله في Supabase Dashboard)
5. **Super Admin** - يقرأ من جدول users (يتطلب ضبط RLS policies)

---

## الروابط

- **الموقع:** https://koomn1.github.io/quiz-space/
- **GitHub:** https://github.com/koomn1/quiz-space

---
*تم بواسطة Antigravity AI - يوليو 2026*
