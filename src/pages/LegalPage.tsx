import React from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, FileText, ShieldCheck, Sparkles } from 'lucide-react';

type LegalPageKey = 'terms' | 'privacy' | 'cookies' | 'acceptable-use' | 'contact' | 'portfolio';

interface LegalPageProps {
  page: LegalPageKey;
  lang: 'ar' | 'en';
}

const portfolioUrl = 'https://jo-badawy.lovable.app/';

type LocalizedCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: string[][];
};

const content: Record<LegalPageKey, { ar: LocalizedCopy; en: LocalizedCopy }> = {
  terms: {
    ar: {
      eyebrow: 'الشروط والسياسات',
      title: 'شروط استخدام Quiz Space',
      intro: 'Quiz Space منصة تعليمية تساعد المستخدمين على إنشاء الاختبارات، مراجعة المحتوى، مشاركة الاختبارات، ومتابعة التقدم. باستخدام المنصة، توافق على هذه الشروط وعلى استخدامها بطريقة قانونية وتعليمية مسؤولة.',
      sections: [
        ['طبيعة المنصة', 'Quiz Space أداة تعليمية وتنظيمية وليست مؤسسة تعليمية معتمدة، ولا تمنح شهادة أو درجة رسمية من تلقاء نفسها. النتائج، الدرجات، والتفسيرات داخل المنصة مخصصة للمراجعة والتدريب ولا تحل محل المعلم أو المصدر الأكاديمي المعتمد.'],
        ['الحساب وحماية بيانات الدخول', 'يجب تقديم بيانات صحيحة عند إنشاء الحساب. أنت مسؤول عن كلمة المرور وكل نشاط يتم من خلال حسابك، ويجب إبلاغنا إذا اشتبهت في دخول غير مصرح به. لا تنشئ حسابات متعددة للتحايل على حدود الاستخدام أو الاشتراكات.'],
        ['إنشاء الاختبارات والمحتوى المرفوع', 'تحتفظ بملكية النصوص والملفات والصور التي ترفعها، وتمنح Quiz Space إذنًا تقنيًا محدودًا لمعالجتها وتخزينها وعرضها فقط لتشغيل ميزات الاستخراج وإنشاء الاختبارات والحفظ والمشاركة التي تختارها. يجب أن تملك حق استخدام كل محتوى ترفعه، وألا يحتوي على بيانات شخصية أو سرية لا تحتاجها المنصة.'],
        ['الاختبارات المنشورة والمحتوى العام', 'إذا جعلت اختبارًا أو ملفًا أو منشورًا متاحًا للعامة، فأنت مسؤول عن دقته وملاءمته وحقوق نشره. لا تضع في اختبار عام إجابات أو بيانات طالب أو معلومات خاصة أو مواد محمية لا تملك إذن نشرها.'],
        ['الذكاء الاصطناعي والاستخراج', 'قد تستخدم المنصة الذكاء الاصطناعي لاستخراج النص، تحليل الصفحات، إنشاء الأسئلة، اقتراح الإجابات أو شرحها. قد تحدث أخطاء أو إجابات ناقصة أو غير دقيقة؛ لذلك يجب مراجعة الناتج مقابل المصدر قبل نشر الاختبار أو استخدامه في الدراسة أو التقييم.'],
        ['النزاهة الأكاديمية', 'لا تستخدم Quiz Space للغش أو انتحال عمل طالب آخر أو تسريب اختبارات سرية أو تقديم إجابات مولدة آليًا على أنها عمل شخصي عندما تمنع قواعد المؤسسة ذلك. مسؤولية الالتزام بسياسة المدرسة أو الجامعة أو المعلم تقع على المستخدم.'],
        ['الاشتراكات والمدفوعات', 'إذا فعّلت اشتراكًا أو خدمة مدفوعة، تُطبق تفاصيل الخطة والسعر وطريقة الدفع المعروضة وقت الطلب. لا تمنح العضوية صلاحية تجاوز قواعد المحتوى أو الأمان. تُرسل طلبات الدعم أو الاسترداد عبر قنوات التواصل، وتخضع للسياسة المعروضة وللقانون الواجب التطبيق.'],
        ['التعليق والتعديل وتوافر الخدمة', 'يجوز لنا تقييد أو تعليق الحساب أو إزالة محتوى يخالف هذه الشروط أو يعرّض المستخدمين أو الخدمة للخطر. قد تتغير الميزات أو تتوقف مؤقتًا للصيانة والأمان. نبذل جهدًا معقولًا لحماية المسودات والبيانات، لكن لا نضمن تشغيل الخدمة دون انقطاع أو فقدانًا مستحيلًا للبيانات.'],
        ['حدود المسؤولية', 'تستخدم المنصة على مسؤوليتك. لا نضمن أن كل سؤال أو إجابة أو نتيجة تحليل آلي صحيحة أو مناسبة لكل مستوى دراسي. قبل اعتماد أي نتيجة في قرار تعليمي أو اختبار رسمي، راجعها مع المصدر أو المختص.'],
        ['التحديثات', 'قد نحدّث هذه الشروط عند إضافة ميزات أو تغييرات جوهرية. استمرارك في استخدام المنصة بعد نشر التحديث يعني قبول النسخة المعدلة، مع بقاء الحقوق الإلزامية التي يمنحها القانون للمستخدم.'],
      ],
    },
    en: {
      eyebrow: 'Terms and policies',
      title: 'Quiz Space Terms of Service',
      intro: 'Quiz Space is an educational platform for creating quizzes, reviewing material, sharing quizzes, and tracking progress. By using it, you agree to these terms and to responsible educational use.',
      sections: [
        ['Nature of the platform', 'Quiz Space is an educational and organizational tool. It is not an accredited educational institution and does not automatically issue official certificates or grades. Scores, explanations, and results are for practice and review and do not replace a teacher or an approved academic source.'],
        ['Accounts and credentials', 'Provide accurate account information. You are responsible for your password and activity on your account, and should report suspected unauthorized access. Do not create multiple accounts to bypass usage limits or subscription rules.'],
        ['Quizzes and uploaded content', 'You retain ownership of text, files, and images you upload. You grant Quiz Space a limited technical permission to process, store, and display them only to provide extraction, quiz-generation, saving, and sharing features you choose to use. You must have the right to use everything you upload and should not upload unnecessary confidential or personal data.'],
        ['Published quizzes and public content', 'When you make a quiz, file, or post public, you are responsible for its accuracy, suitability, and publishing rights. Do not publish student answers, private information, confidential examinations, or material you are not allowed to redistribute.'],
        ['AI and document extraction', 'The platform may use AI to extract text, analyze pages, generate questions, suggest answers, or explain them. AI output can be incomplete or wrong. Review it against the source before publishing a quiz or relying on it for study or assessment.'],
        ['Academic integrity', 'Do not use Quiz Space for cheating, impersonating another student, leaking confidential examinations, or presenting AI-generated answers as personal work when school or university rules prohibit it. You are responsible for following your institution’s academic-integrity policy.'],
        ['Subscriptions and payments', 'If you activate a paid plan, the plan details, price, and payment method shown at checkout apply to that request. Membership does not authorize bypassing content or security rules. Support or refund requests must be submitted through the available contact channels and are handled under the displayed policy and applicable law.'],
        ['Suspension and availability', 'We may restrict or suspend an account or remove content that violates these terms or puts users or the service at risk. Features may change or be temporarily unavailable for maintenance and security. We take reasonable steps to protect drafts and data, but cannot guarantee uninterrupted service or impossible-to-prevent data loss.'],
        ['Responsibility for results', 'You use the platform at your own discretion. We do not guarantee that every generated question, answer, explanation, or score is correct or suitable for every level. Verify important educational decisions and official assessments with the source or a qualified educator.'],
        ['Updates', 'We may update these terms when features or legal requirements change. Continued use after an update is published means acceptance of the revised version, subject to rights that cannot be waived under applicable law.'],
      ],
    },
  },
  privacy: {
    ar: {
      eyebrow: 'البيانات والحماية',
      title: 'سياسة الخصوصية',
      intro: 'تشرح هذه السياسة ما قد تعالجه Quiz Space لتشغيل الحسابات والاختبارات والميزات التعليمية، وكيف يمكنك التحكم في بياناتك أو طلب حذفها.',
      sections: [
        ['بيانات الحساب', 'قد نعالج الاسم والبريد وإعدادات اللغة والثيم ومعرّف الحساب وصورة الملف الشخصي وبيانات تسجيل الدخول اللازمة للمصادقة. نستخدمها لتشغيل الحساب، حفظ المحتوى، مزامنة التفضيلات، وتقديم الدعم.'],
        ['بيانات التعلم والاختبارات', 'قد نعالج الاختبارات التي تنشئها، الإجابات، المحاولات، الدرجات، التقدم، النقاط، الشارات، التحديات، المفضلة، والتفاعلات التي تختار حفظها. نستخدمها لعرض النتائج، تشغيل التنافس، تحسين المراجعة، وحماية الحساب من إساءة الاستخدام.'],
        ['الملفات والصور', 'عند رفع PDF أو مستند أو صورة، قد تتم معالجته لاستخراج النص أو إنشاء الأسئلة أو إرفاق صورة بسؤال، ثم يُخزن في التخزين المخصص عند حفظه. لا ترفع سجلات طبية أو أرقام هوية أو بيانات أطفال أو مستندات سرية إلا إذا كان لديك أساس واضح وموافقة لازمة لذلك.'],
        ['معالجة الذكاء الاصطناعي', 'قد يُرسل النص أو الصور الضرورية من الملف إلى مزود الذكاء الاصطناعي المختار لتقديم الاستخراج أو التوليد أو الشرح. راجع طبيعة الملف قبل رفعه، ولا تستخدم المنصة لمعالجة بيانات حساسة لا تحتاجها الميزة.'],
        ['المحتوى العام والملفات المنشورة', 'إذا نشرت اختبارًا أو تفاعلًا للعامة، قد يظهر عنوانه ومحتواه واسم المنشئ والنتائج العامة وفقًا لإعدادات المنصة. يمكنك تعديل المحتوى أو حذفه عندما تتيح الواجهة ذلك، مع احتمال بقاء نسخ فنية مؤقتة أو سجلات أمان لازمة.'],
        ['مزودو الخدمات', 'قد نعتمد على Supabase للمصادقة وقاعدة البيانات والتخزين، وCloudflare لتشغيل الحافة والمهام، ومزودي الذكاء الاصطناعي والمعالجة والإشعارات والدفع عند تفعيل هذه الميزات. نعطي كل مزود الحد اللازم لتقديم خدمته ولا نضع مفاتيح الخدمات السرية في الواجهة.'],
        ['الدفع والبيانات المالية', 'تُعالج بيانات الدفع عبر مزود الدفع أو القناة المعروضة، ولا ينبغي إرسال أرقام البطاقات أو كلمات المرور في رسائل الدعم أو حقول رفع الإيصالات. قد نحتفظ بحالة الطلب والمبلغ والطريقة والإيصال اللازمين لمراجعة الاشتراك والنزاعات.'],
        ['الأمان والاحتفاظ', 'نستخدم ضوابط المصادقة والصلاحيات والتخزين المناسبة للمساعدة في حماية البيانات. نحتفظ بالمعلومات ما دامت لازمة لتشغيل الحساب، تقديم الخدمة، حل النزاعات، منع الاحتيال، أو الوفاء بالتزامات قانونية، ثم نحذف أو نجهّلها عندما يكون ذلك ممكنًا.'],
        ['الأطفال والقُصّر', 'Quiz Space ليست موجهة لجمع بيانات الأطفال دون إشراف. إذا كان المستخدم قاصرًا، فيجب استخدام المنصة بموافقة وإشراف ولي الأمر أو المؤسسة التعليمية وبما يتوافق مع القانون المحلي. تواصل معنا إذا أرسلت بيانات قاصر دون قصد.'],
        ['حقوقك وطلباتك', 'يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها أو معرفة طريقة استخدامها عبر صفحة التواصل. قد نطلب التحقق من ملكية الحساب، وقد نحتفظ بحد أدنى من السجلات عندما يفرض القانون أو يتطلب الأمان ذلك.'],
      ],
    },
    en: {
      eyebrow: 'Data and protection',
      title: 'Privacy Policy',
      intro: 'This policy explains what Quiz Space may process to operate accounts, quizzes, and learning features, and how you can control or delete your data.',
      sections: [
        ['Account data', 'We may process your name, email, language and theme settings, account identifier, profile image, and authentication data needed to operate your account, save content, synchronize preferences, and provide support.'],
        ['Learning and quiz data', 'We may process quizzes, answers, attempts, scores, progress, points, badges, challenges, bookmarks, and interactions that you choose to save. This supports results, competition, review features, and abuse prevention.'],
        ['Files and images', 'When you upload a PDF, document, or image, it may be processed for text extraction, question generation, or question media, and stored in dedicated storage when saved. Do not upload medical records, identity numbers, children’s data, or confidential documents unless you have a clear lawful basis and required consent.'],
        ['AI processing', 'Text or images needed for extraction, generation, or explanation may be sent to the selected AI provider. Review the file before uploading it and do not use the platform to process sensitive data that the feature does not need.'],
        ['Public content', 'If you publish a quiz or interaction publicly, its title, content, creator name, and public results may be visible according to platform settings. You can edit or delete content where the interface allows it, although temporary technical copies or security logs may remain when necessary.'],
        ['Service providers', 'Supabase may support authentication, database, and storage; Cloudflare may support edge delivery and jobs; and AI, notification, and payment providers may support optional features. Each provider receives only what is needed for its service, and secret service keys are not placed in the client interface.'],
        ['Payments', 'Payment details are handled by the payment provider or channel shown to you. Do not send card numbers or passwords in support messages or receipt uploads. We may retain request status, amount, method, and receipt information needed to review a subscription or dispute.'],
        ['Security and retention', 'We use authentication, authorization, and storage controls intended to protect data. We retain information as long as needed to operate accounts, provide the service, resolve disputes, prevent fraud, or meet legal obligations, and delete or de-identify it when practical.'],
        ['Children and minors', 'Quiz Space is not intended to collect children’s data without appropriate supervision. Minors should use the platform with a parent, guardian, or educational institution’s consent and supervision, consistent with local law. Contact us if a minor’s data was submitted unintentionally.'],
        ['Your requests', 'You may request access, correction, deletion, or an explanation of data use through the Contact page. We may verify account ownership and retain a limited record when required by law or security needs.'],
      ],
    },
  },
  cookies: {
    ar: { eyebrow: 'التصفح والتفضيلات', title: 'سياسة ملفات الارتباط والتخزين المحلي', intro: 'يستخدم Quiz Space تقنيات المتصفح الضرورية لتشغيل الجلسة وحفظ التفضيلات والمسودات وتحسين الأداء.', sections: [['التقنيات الضرورية', 'نستخدم بيانات الجلسة والتخزين المحلي لتذكر تسجيل الدخول، اللغة، الثيم، حالة التنبيهات، إعدادات الواجهة، وبعض المسودات المحلية. تعطيلها قد يمنع أجزاء من المنصة من العمل.'], ['مسودات الاختبارات', 'قد تُحفظ بعض المسودات أو حالة الاستئناف على جهازك حتى تعود إليها. التخزين المحلي ليس نسخة احتياطية مضمونة؛ استخدم الحفظ على الحساب عندما تريد الاحتفاظ الدائم.'], ['الأداء والأخطاء', 'قد تُرسل مؤشرات تقنية محدودة عن الأداء والأخطاء لمساعدتنا في اكتشاف الأعطال وتحسين سرعة المنصة. لا نستخدم هذه السياسة لبيع بياناتك الشخصية.'], ['التحكم والحذف', 'يمكنك حذف بيانات الموقع من إعدادات المتصفح. قد يؤدي ذلك إلى تسجيل خروجك أو حذف تفضيلاتك ومسوداتك المحلية، لكنه لا يحذف تلقائيًا المحتوى المحفوظ على حسابك.']] },
    en: { eyebrow: 'Browsing and preferences', title: 'Cookie and Local Storage Policy', intro: 'Quiz Space uses essential browser technologies to support sessions, remember preferences and drafts, and improve performance.', sections: [['Essential technologies', 'Session data and local storage may remember sign-in state, language, theme, notification settings, interface preferences, and some local drafts. Disabling them may prevent parts of the platform from working.'], ['Quiz drafts', 'Some drafts or resume state may be stored on your device. Local storage is not a guaranteed backup; save to your account when you need durable retention.'], ['Performance and errors', 'Limited technical performance and error signals may help us detect failures and improve speed. We do not use this policy to sell personal data.'], ['Control and deletion', 'You can clear site data from browser settings. This may sign you out or remove local preferences and drafts, but it does not automatically delete content saved to your account.']] },
  },
  'acceptable-use': {
    ar: { eyebrow: 'السلامة والنزاهة التعليمية', title: 'سياسة الاستخدام المقبول', intro: 'تحمي هذه السياسة المستخدمين والمحتوى التعليمي وتوضح السلوكيات التي لا تناسب Quiz Space.', sections: [['احترام المستخدمين', 'يُمنع التهديد أو التحرش أو الكراهية أو التمييز أو انتحال شخصية طالب أو معلم أو موظف.'], ['النزاهة الأكاديمية', 'لا تستخدم المنصة للغش أو تسريب امتحان أو سرقة إجابات أو تقديم عمل شخص آخر أو مخرجات الذكاء الاصطناعي كعمل شخصي عند منع ذلك.'], ['حقوق النشر والخصوصية', 'لا ترفع أو تنشر كتبًا أو ملازم أو صورًا أو اختبارات لا تملك حق استخدامها، ولا تضع بيانات طلاب أو أطفال أو مرضى أو أي معلومات خاصة داخل اختبار عام.'], ['سلامة الخدمة', 'يُمنع اختراق الحسابات، اختبار الثغرات دون إذن، تعطيل الخدمة، نشر برمجيات خبيثة، استخراج البيانات بالجملة، أو تجاوز حدود الخطط أو أنظمة الدفع.'], ['المحتوى التعليمي المسؤول', 'لا تنشر أسئلة أو شروحات تحرض على العنف أو الاحتيال أو إيذاء النفس أو نشاط غير قانوني. يجب مراجعة المحتوى المولد آليًا قبل مشاركته.'], ['الإبلاغ والتنفيذ', 'أبلغنا عبر صفحة التواصل عن المحتوى الضار أو انتهاك الحقوق أو الخلل الأمني. قد نزيل المحتوى أو نحد الحساب أو نطلب معلومات إضافية للتحقق.']] },
    en: { eyebrow: 'Safety and academic integrity', title: 'Acceptable Use Policy', intro: 'This policy protects users and educational content and explains conduct that is not appropriate for Quiz Space.', sections: [['Respect users', 'Threats, harassment, hate, discrimination, and impersonating a student, teacher, or staff member are prohibited.'], ['Academic integrity', 'Do not use the platform to cheat, leak examinations, steal answers, submit another person’s work, or present AI output as personal work when prohibited.'], ['Copyright and privacy', 'Do not upload or publish books, handouts, images, or examinations you are not allowed to use, and do not place student, child, patient, or other private information in a public quiz.'], ['Service safety', 'Account intrusion, unauthorized security testing, disruption, malware, bulk extraction, and bypassing plan or payment controls are prohibited.'], ['Responsible educational content', 'Do not publish questions or explanations that encourage violence, fraud, self-harm, or illegal activity. Review AI-generated material before sharing it.'], ['Reporting and enforcement', 'Report harmful content, rights violations, or security issues through the Contact page. We may remove content, restrict an account, or request information for verification.']] },
  },
  contact: {
    ar: { eyebrow: 'تواصل معنا', title: 'مركز التواصل وطلبات البيانات', intro: 'استخدم هذه الصفحة لمعرفة طريقة التواصل بشأن الدعم، الخصوصية، المحتوى، الاشتراكات، أو بلاغات الأمان.', sections: [['الدعم التقني', 'افتح صفحة الدعم من القائمة، واذكر الجهاز والمتصفح والخطوات التي سببت المشكلة. لا ترسل كلمة المرور أو مفاتيح API.'], ['الخصوصية وحذف الحساب', 'اذكر البريد المرتبط بالحساب والطلب المطلوب بوضوح، مثل الوصول إلى البيانات أو تصحيحها أو حذف الحساب. قد نطلب إثبات ملكية الحساب.'], ['المحتوى والحقوق', 'إذا وجدت اختبارًا أو صورة أو ملفًا ينتهك حقوقك، أرسل الرابط ووصف الحق الذي تملكه. لا ترفع نسخة إضافية من المادة المخالفة.'], ['الاشتراكات والإيصالات', 'للاستفسار عن طلب دفع أو إيصال، استخدم رقم الطلب أو البريد والمبلغ والطريقة الظاهرة في الطلب. لا ترسل بيانات بطاقة كاملة.'], ['بلاغات الأمان', 'أرسل وصفًا خاصًا للخلل وخطوات إعادة إنتاجه. لا تستغل الخلل أو تصل إلى بيانات مستخدمين آخرين.']] },
    en: { eyebrow: 'Get in touch', title: 'Contact and Data Requests', intro: 'Use this page to understand how to contact us about support, privacy, content, subscriptions, or security reports.', sections: [['Technical support', 'Open the Support page and include your device, browser, and reproduction steps. Never send a password or API key.'], ['Privacy and deletion', 'State the account email and request clearly, such as access, correction, or account deletion. We may verify account ownership.'], ['Content and rights', 'If a quiz, image, or file violates your rights, send its link and describe the right you own. Do not upload another copy of the disputed material.'], ['Subscriptions and receipts', 'For a payment request or receipt, use the request identifier or account email, amount, and displayed method. Never send a full card number.'], ['Security reports', 'Send a private description and reproduction steps. Do not exploit the issue or access another user’s data.']] },
  },
  portfolio: {
    ar: { eyebrow: 'عن صاحب المشروع', title: 'بورتفوليو يوسف بدوي', intro: 'Quiz Space مشروع تعليمي يجمع بين بناء أدوات الاختبارات والذكاء الاصطناعي وتجارب التعلم الرقمية.', sections: [['عن يوسف', 'د. يوسف بدوي مهتم بالطب البيطري، الذكاء الاصطناعي التطبيقي، تصميم المنتجات الرقمية، والسرد البصري.'], ['صلة البورتفوليو بالمشروع', 'يعرض البورتفوليو الخلفية المهنية والأعمال التي تساعد على فهم توجه Quiz Space في الجمع بين التعليم والتقنية والتجربة البصرية.'], ['زيارة البورتفوليو', 'يفتح الرابط الخارجي في صفحة مستقلة حتى تظل جلسة Quiz Space وبياناتك داخل المنصة.']] },
    en: { eyebrow: 'About the creator', title: 'Youssef Badawy Portfolio', intro: 'Quiz Space is an educational project combining quiz tools, applied AI, and digital learning experiences.', sections: [['About Youssef', 'Dr. Youssef Badawy works across veterinary medicine, applied AI, digital product design, and visual storytelling.'], ['How it relates to the project', 'The portfolio presents the professional background and work behind Quiz Space’s combination of education, technology, and visual experience.'], ['Visit the portfolio', 'The external link opens in a separate page so your Quiz Space session and data remain inside the platform.']] },
  },
};

export default function LegalPage({ page, lang }: LegalPageProps) {
  const isAr = lang === 'ar';
  const copy = content[page][isAr ? 'ar' : 'en'];
  const BackIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/80 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
        <div className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 px-6 py-10 text-white sm:px-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-cyan-200"><ShieldCheck className="h-7 w-7" /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">{copy.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{copy.title}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-200 sm:text-base">{copy.intro}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:p-8">
          {copy.sections.map(([title, text]) => (
            <article key={title} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white"><FileText className="h-4 w-4 text-cyan-500" />{title}</h2>
              <p className="mt-3 text-sm leading-8 text-slate-600 dark:text-slate-300">{text}</p>
            </article>
          ))}
          {page === 'portfolio' && (
            <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5">
              <Sparkles className="h-4 w-4" />
              {isAr ? 'فتح البورتفوليو الشخصي' : 'Open personal portfolio'}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <a href="#/dashboard/landing" className="mt-2 inline-flex items-center gap-2 text-sm font-black text-indigo-600 transition hover:text-cyan-500 dark:text-cyan-300">
            <BackIcon className="h-4 w-4" />
            {isAr ? 'العودة إلى Quiz Space' : 'Back to Quiz Space'}
          </a>
        </div>
      </div>
    </section>
  );
}
