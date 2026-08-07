import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Mail, Phone, MessageCircle, Heart, Shield, Zap, Star } from 'lucide-react';

interface SupportProps {
  lang: 'ar' | 'en';
}

export default function Support({ lang }: SupportProps) {
  const isAr = lang === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from(".support-header", { opacity: 0, y: -30, duration: 0.8, ease: "power3.out" })
      .from(".support-card", { opacity: 0, scale: 0.9, duration: 0.6, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from(".support-footer", { opacity: 0, y: 20, duration: 0.5 }, "-=0.2");
  }, { scope: containerRef });

  const contactMethods = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: isAr ? 'البريد الإلكتروني' : 'Email Support',
      value: 'youssefbadawy5002@gmail.com',
      link: 'mailto:youssefbadawy5002@gmail.com',
      color: 'bg-blue-500',
      desc: isAr ? 'راسلنا في أي وقت وسنرد عليك خلال 24 ساعة.' : 'Email us anytime, we reply within 24 hours.'
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: isAr ? 'اتصال هاتفي' : 'Phone Call',
      value: '01018995002',
      link: 'tel:01018995002',
      color: 'bg-indigo-500',
      desc: isAr ? 'متاحون للرد على استفساراتكم العاجلة.' : 'Available for your urgent inquiries.'
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: isAr ? 'واتساب' : 'WhatsApp',
      value: '01018995002',
      link: 'https://wa.me/201018995002',
      color: 'bg-green-500',
      desc: isAr ? 'تواصل معنا مباشرة عبر الواتساب.' : 'Chat with us directly on WhatsApp.'
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-50 dark:bg-[#0f172a] p-6 md:p-12 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="support-header text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl mb-6 text-purple-600 dark:text-purple-400 shadow-sm">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
            {isAr ? 'نحن هنا لمساعدتك' : 'We\'re Here to Help'}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            {isAr 
              ? 'شكرًا لكونك جزءًا من عائلة QuizSpace. نحن نسعى دائماً لتقديم أفضل تجربة تعليمية لك، وفريقنا جاهز للإجابة على جميع استفساراتك.' 
              : 'Thank you for being part of the QuizSpace family. We strive to provide the best educational experience, and our team is ready to answer all your questions.'}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { icon: <Shield className="w-5 h-5" />, title: isAr ? 'دعم آمن' : 'Secure Support', desc: isAr ? 'بياناتك وخصوصيتك هي أولويتنا.' : 'Your data and privacy are our priority.' },
            { icon: <Zap className="w-5 h-5" />, title: isAr ? 'استجابة سريعة' : 'Fast Response', desc: isAr ? 'نرد على جميع الاستفسارات بأسرع وقت.' : 'We reply to all inquiries as fast as possible.' },
            { icon: <Star className="w-5 h-5" />, title: isAr ? 'خدمة متميزة' : 'Premium Service', desc: isAr ? 'نهتم بكل تفاصيل تجربتك التعليمية.' : 'We care about every detail of your learning experience.' }
          ].map((feat, i) => (
            <div key={i} className="support-card p-8 bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                {feat.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">{feat.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactMethods.map((method, idx) => (
            <a 
              key={idx} 
              href={method.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="support-card group relative overflow-hidden p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${method.color} opacity-5 blur-3xl -mr-16 -mt-16 group-hover:opacity-10 transition-opacity`} />
              
              <div className={`w-14 h-14 rounded-2xl ${method.color} text-white flex items-center justify-center mb-6 shadow-lg shadow-inherit/20`}>
                {method.icon}
              </div>
              
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                {method.title}
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-medium">
                {method.desc}
              </p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">
                  {method.value}
                </span>
                <div className={`w-8 h-8 rounded-full ${method.color} text-white flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all`}>
                  <Zap className="w-4 h-4 fill-current" />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Footer Text */}
        <div className="support-footer text-center mt-20">
          <p className="text-slate-400 dark:text-slate-500 text-sm font-bold tracking-wide">
            {isAr ? '© 2026 QuizSpace - صنع بكل حب لدعم رحلتك التعليمية' : '© 2026 QuizSpace - Made with love to support your learning journey'}
          </p>
        </div>
      </div>
    </div>
  );
}
