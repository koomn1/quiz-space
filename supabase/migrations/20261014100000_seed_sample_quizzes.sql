-- Seed sample quizzes into public.quizzes table if not exists so solving them updates total_plays and solvers list
INSERT INTO public.quizzes (
  id, title, description, creator_id, creator_name, questions, total_plays, avg_rating, ratings_count, time_limit, category
) VALUES (
  'quiz-ai-intro',
  'اختبار تاريخ الذكاء الاصطناعي والابتكار 🤖',
  'اختبار رائع وممتع لتقييم معرفتك بنشأة الذكاء الاصطناعي وتطوره عبر التاريخ الحديث.',
  'ec7d1f35-cbd2-42cd-bebd-6a0813554822',
  'فريق QuizSpace',
  '[
    {"id":"q1","text":"من هو العالم الذي صاغ اختبار التورينج الشهير للذكاء الاصطناعي؟","type":"mcq","options":["آلان تورينج (Alan Turing)","جون ماكارتي","إيلون ماسك","ستيف جوبز"],"correctIndex":0,"explanation":"قدم آلان تورينج عام 1950 فكرة اختبار التورينج لقياس قدرة الآلة على التفكير والتفكير البشري."},
    {"id":"q2","text":"ما معنى مصطلح LLM في مجالات الذكاء الاصطناعي الحالية؟","type":"mcq","options":["Large Language Model (نموذج لغوي ضخم)","Light Logic Machine","Linear Learning Method","Long Memory Matrix"],"correctIndex":0,"explanation":"LLM تشير إلى Large Language Model وهي نماذج مدربة على كميات ضخمة من البيانات اللغوية."},
    {"id":"q3","text":"أي عام تم فيه إطلاق نموذج ChatGPT لأول مرة للعامة؟","type":"mcq","options":["أواخر عام 2022","عام 2020","عام 2018","عام 2024"],"correctIndex":0,"explanation":"تم إطلاق ChatGPT بواسطة OpenAI في نوفمبر 2022 وحقق انتشاراً هائلاً على مستوى العالم."}
  ]'::jsonb,
  0,
  5.0,
  1,
  60,
  'ذكاء اصطناعي'
), (
  'quiz-web-tech',
  'تحدي البرمجة وتقنيات الويب الحديثة 💻',
  'اختبار شامل حول أحدث تقنيات React, TypeScript و HTML5 للبرمجيات.',
  'ec7d1f35-cbd2-42cd-bebd-6a0813554822',
  'أكاديمية المطورين',
  '[
    {"id":"qw1","text":"ما هي الفائدة الرئيسية لاستخدام TypeScript بدلاً من JavaScript العادية؟","type":"mcq","options":["إضافة الأنواع (Static Typing) واكتشاف الأخطاء مبكراً","تسريع تشغيل الكود في المتصفح 10 مرات","استبدال ملفات HTML","إلغاء الحاجة للسيرفر"],"correctIndex":0,"explanation":"يوفر TypeScript نظام أنواع ثابت يشخص الأخطاء البرمجية قبل تشغيل الكود."},
    {"id":"qw2","text":"في مكتبة React، ما المفهوم المستخدم لإدارة التأثيرات الجانبية (Side Effects)؟","type":"mcq","options":["Hook (useEffect)","useState","useContext","useRef"],"correctIndex":0,"explanation":"يُستخدم Hook الإيعاز useEffect للتعامل مع العمليات الجانبية مثل جلب البيانات والتنصت على الأحداث."}
  ]'::jsonb,
  0,
  5.0,
  1,
  90,
  'برمجة وتقنية'
) ON CONFLICT (id) DO NOTHING;
