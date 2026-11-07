import React from 'react';

type SeoLanguage = 'ar' | 'en';

type SEOProps = {
  activeTab: string;
  lang: SeoLanguage;
};

type SeoCopy = {
  title: string;
  description: string;
  keywords: string;
};

const siteUrl = 'https://quiz-space-app.pages.dev/';
const imageUrl = `${siteUrl}share-card.jpg`;

const copy: Record<SeoLanguage, Record<string, SeoCopy>> = {
  ar: {
    home: {
      title: 'Quiz Space | منصة الاختبارات الذكية والتعلم التفاعلي',
      description: 'Quiz Space منصة اختبارات ذكية باللغة العربية تساعد الطلاب والمعلمين والمؤسسات على إنشاء الاختبارات من النصوص والملفات، حلها، متابعة التقدم، ومشاركة التحديات التعليمية.',
      keywords: 'منصة اختبارات, اختبارات اونلاين, إنشاء اختبار, اختبارات تعليمية, ذكاء اصطناعي للتعليم, Quiz Space, كويز سبيس',
    },
    terms: { title: 'شروط استخدام Quiz Space', description: 'شروط استخدام منصة Quiz Space لإنشاء الاختبارات والتعلم والمشاركة بأمان.', keywords: 'شروط استخدام Quiz Space' },
    privacy: { title: 'سياسة الخصوصية | Quiz Space', description: 'تعرف على كيفية تعامل Quiz Space مع بيانات الحساب والاختبارات والملفات والصور.', keywords: 'سياسة الخصوصية Quiz Space' },
    cookies: { title: 'سياسة ملفات الارتباط | Quiz Space', description: 'تعرف على استخدام ملفات الارتباط والتخزين المحلي داخل Quiz Space.', keywords: 'ملفات الارتباط Quiz Space' },
    'acceptable-use': { title: 'سياسة الاستخدام المقبول | Quiz Space', description: 'قواعد الاستخدام الآمن والمسؤول للمحتوى التعليمي والذكاء الاصطناعي في Quiz Space.', keywords: 'سياسة الاستخدام المقبول Quiz Space' },
    contact: { title: 'التواصل وطلبات البيانات | Quiz Space', description: 'تواصل مع فريق Quiz Space للدعم وطلبات الخصوصية والمحتوى والأمان.', keywords: 'تواصل Quiz Space, دعم Quiz Space' },
    portfolio: { title: 'عن مشروع Quiz Space | بورتفوليو يوسف بدوي', description: 'تعرف على مشروع Quiz Space ورؤيته في الجمع بين التعليم والذكاء الاصطناعي وتجارب التعلم الرقمية.', keywords: 'عن Quiz Space, بورتفوليو يوسف بدوي, مشروع تعليمي' },
  },
  en: {
    home: {
      title: 'Quiz Space | AI Quiz Maker and Interactive Learning Platform',
      description: 'Quiz Space helps students, educators, and institutions create quizzes from text and files, practice interactively, track progress, and share learning challenges.',
      keywords: 'online quiz maker, educational quizzes, AI quiz generator, interactive learning, Quiz Space',
    },
    terms: { title: 'Quiz Space Terms of Service', description: 'Terms for creating, practicing, and sharing educational quizzes on Quiz Space.', keywords: 'Quiz Space terms of service' },
    privacy: { title: 'Privacy Policy | Quiz Space', description: 'Learn how Quiz Space handles account, quiz, file, and image data.', keywords: 'Quiz Space privacy policy' },
    cookies: { title: 'Cookie and Local Storage Policy | Quiz Space', description: 'Learn how Quiz Space uses cookies and local storage to support the product.', keywords: 'Quiz Space cookie policy' },
    'acceptable-use': { title: 'Acceptable Use Policy | Quiz Space', description: 'Rules for safe and responsible educational content and AI use on Quiz Space.', keywords: 'Quiz Space acceptable use' },
    contact: { title: 'Contact and Data Requests | Quiz Space', description: 'Contact Quiz Space for support, privacy, content, and security requests.', keywords: 'Quiz Space contact, Quiz Space support' },
    portfolio: { title: 'About Quiz Space | Youssef Badawy Portfolio', description: 'Learn about Quiz Space and its vision for combining education, applied AI, and digital learning experiences.', keywords: 'about Quiz Space, Youssef Badawy portfolio, educational project' },
  },
};

function upsertMeta(attribute: 'name' | 'property', key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = value;
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

export default function SEO({ activeTab, lang }: SEOProps) {
  React.useEffect(() => {
    const isAr = lang === 'ar';
    const pageKey = activeTab.startsWith('legal-') ? activeTab.slice('legal-'.length) : 'home';
    const page = copy[lang][pageKey] || copy[lang].home;
    const canonical = pageKey === 'home' ? siteUrl : `${siteUrl}legal/${pageKey}`;

    document.title = page.title;
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';

    upsertMeta('name', 'description', page.description);
    upsertMeta('name', 'keywords', page.keywords);
    upsertMeta('name', 'author', 'Quiz Space');
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Quiz Space');
    upsertMeta('property', 'og:title', page.title);
    upsertMeta('property', 'og:description', page.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:alt', isAr ? 'شعار ومنصة Quiz Space للاختبارات الذكية' : 'Quiz Space AI quiz and learning platform');
    upsertMeta('property', 'og:locale', isAr ? 'ar_AR' : 'en_US');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', page.title);
    upsertMeta('name', 'twitter:description', page.description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertLink('canonical', canonical);

    const existingSchema = document.getElementById('quizspace-seo-schema') as HTMLScriptElement | null;
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          '@id': `${siteUrl}#app`,
          name: 'Quiz Space',
          alternateName: isAr ? 'منصة الاختبارات الذكية' : 'AI Quiz Maker',
          url: siteUrl,
          image: imageUrl,
          description: copy[lang].home.description,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web',
          inLanguage: ['ar', 'en'],
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
        {
          '@type': 'Organization',
          '@id': `${siteUrl}#organization`,
          name: 'Quiz Space',
          url: siteUrl,
          logo: `${siteUrl}brand/quizspace-icon-192.webp`,
          email: 'youssefbadawy5002@gmail.com',
        },
        {
          '@type': 'WebSite',
          '@id': `${siteUrl}#website`,
          name: 'Quiz Space',
          url: siteUrl,
          inLanguage: lang,
          publisher: { '@id': `${siteUrl}#organization` },
        },
      ],
    };

    const schemaElement: HTMLScriptElement = existingSchema || document.createElement('script');
    schemaElement.id = 'quizspace-seo-schema';
    schemaElement.type = 'application/ld+json';
    schemaElement.textContent = JSON.stringify(schema);
    if (!existingSchema) document.head.appendChild(schemaElement);
  }, [activeTab, lang]);

  return null;
}
