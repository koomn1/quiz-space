<div align="center">

# 🪐 QUIZ SPACE
### منصة الاختبارات التفاعلية والتعلم الذكي بالذكاء الاصطناعي التوليدي

<p align="center">
  <b>اصنع • اختبر • تنافس • تعلّم</b><br>
  منصة تعليمية سحابية متكاملة تجمع بين قوة الذكاء الاصطناعي (AI)، عناصر الألعاب التنافسية (Gamification)، والفصول الدراسية التفاعلية.
</p>

[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#-الترخيص)

</div>

---

## ⚠️ ملكية المشروع وحقوق النشر

> **هذا المشروع ملكية خاصة ومحمي بالكامل.**
>
> جميع حقوق الملكية الفكرية لمنصة **QuizSpace** محفوظة حصرياً لمالكها:
>
> ### 👤 **Youssef Badawy**
>
> ❌ هذا المشروع **ليس مفتوح المصدر (Not Open Source)**
> ❌ **يُحظر** نسخ، استنساخ، تعديل، توزيع، أو إعادة نشر أي جزء من الكود بدون إذن كتابي مسبق
> ❌ **يُحظر** استخدام الكود لأي أغراض تجارية أو شخصية بدون ترخيص رسمي
>
> أي انتهاك لحقوق الملكية سيتم التعامل معه قانونياً.

---

## ✨ رؤية المنصة (Why QuizSpace?)

لم نقم بإنشاء **QuizSpace** لتكون مجرد أداة لإدخال الأسئلة والإجابة عليها، بل لتكون بيئة أكاديمية متكاملة تُحوّل الدراسة إلى تجربة ممتعة وتفاعلية:

- 🤖 **توليد فوري للأسئلة**: تحويل المحاضرات، الكتب الدراسية، وملفات الـ PDF أو الصور إلى اختبارات تفاعلية في ثوانٍ معدودة.
- ⚡ **معالجة موازية فائقة السرعة**: تحليل المستندات المتعددة الصفحات عبر تقنية Parallel Batching السحابية دون إجهاد الجهاز.
- 🏫 **فصول دراسية حية (Classrooms)**: التواصل المباشر بين المعلم والطلاب، مشاركة الواجبات، ولوحات متصدرين خاصة.
- 🎮 **نظام تحفيزي متكامل**: شارات توثيق ملكية، نقاط خبرة (XP)، مستويات مخصصة، وتحديات يومية متجددة.

---

## 🌟 المميزات الرئيسية

### 🎯 استوديو الذكاء الاصطناعي وصناعة الاختبارات
* **توليد متعدد الوسائط**: إنشاء أسئلة من النص المباشر، المواضيع الأكاديمية، أو عبر رفع صور وملفات PDF.
* **تمييز ذكي لأنواع الأسئلة**: التعرف التلقائي والفصل بين الأسئلة الاختيارية (`MCQ`)، الصح والخطأ (`True/False`)، والأسئلة المقالية (`Essay`).
* **تحليل الصور والرسومات البيانية**: استخراج وتضمين وصف التوضيحات البصرية الملحقة بالأسئلة تلقائياً.
* **حفظ المسودات التلقائي**: حفظ غير مرئي للمسودة لمنع ضياع أي محتوى أثناء انقطاع الاتصال أو الخروج الخاطئ.

### 🤖 كوزمو (Cosmo) — المساعد الأكاديمي الشخصي
* شات بوت ذكي متمرس في شرح المناهج وتفكيك المسائل الأكاديمية الصعبة.
* يدعم رؤية الكمبيوتر (Computer Vision) لتحليل ورقات الإجابة والرسومات الرسمية.
* محادثات محفوظة بشكل دائم ومؤمنة سحابياً.

---

## 🏗️ البنية المعمارية للنظام (Architecture)

```mermaid
graph TD
    Client[📱/💻 متصفح العميل - React 19 SPA] -->|تشفير أمان & JWT| Worker[⚡ Cloudflare Worker API Gateway]
    Worker -->|نموذج توليد الأسئلة| AI[🧠 OpenRouter / Vision & LLM Models]
    Client -->|المصادقة والبيانات الحية| Supabase[(🗄️ Supabase Postgres & Realtime Engine)]
    Client -->|تخزين المؤقت المحلي| SW[💾 Service Worker Video & Asset Cache]
```

> 🔒 **الأمان العالي**: جميع مفاتيح الـ API الحساسة محفوظة داخل بيئة Cloudflare المعزولة ولا يتم كشفها إطلاقاً لمتصفح المستخدم.

---

## 🛠️ تقنيات المشروع (Tech Stack)

| النطاق | التقنيات المستخدمة |
| :--- | :--- |
| **الواجهة الأمامية** | React 19 • TypeScript • Vite 6 • Tailwind CSS v4 |
| **التأثيرات والأنيميشن** | GSAP • Canvas Confetti • Lucide Icons |
| **قاعدة البيانات والتشفير** | Supabase Postgres • Row Level Security (RLS) • E2EE Chat |
| **الذكاء الاصطناعي** | OpenRouter (Gemma 4 / Nemotron / Llama 3.3) • Cloudflare Workers |
| **الأداء والكاش** | Custom Service Worker PWA Engine • Vite Immutable Caching |

---

## 📄 الترخيص (License)

**جميع الحقوق محفوظة © 2024-2026 Youssef Badawy**

هذا المشروع **ملكية خاصة ومغلق المصدر**. لا يُسمح بالاستنساخ أو النسخ أو التوزيع أو التعديل بأي شكل من الأشكال بدون إذن كتابي صريح من المالك.

---

<div align="center">

**تم التطوير بواسطة Youssef Badawy 🚀**

</div>
