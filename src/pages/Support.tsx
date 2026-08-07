import React from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Mail, Phone, MessageCircle, Heart, ShieldCheck, Zap } from 'lucide-react';

interface SupportProps {
  lang: 'ar' | 'en';
}

export default function Support({ lang }: SupportProps) {
  const isAr = lang === 'ar';
  const containerRef = React.useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(".support-card", 
      { opacity: 0, y: 30, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.2, ease: 'power3.out' }
    );
    gsap.fromTo(".contact-btn",
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, delay: 0.5, ease: 'back.out(1.7)' }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen p-4 sm:p-8 bg-[#0a0518] text-white overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-indigo-300 bg-clip-text text-transparent">
            {isAr ? 'الدعم الفني والمساعدة' : 'Support & Assistance'}
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            {isAr 
              ? 'نحن هنا لضمان حصولك على أفضل تجربة تعليمية. لا تتردد في التواصل معنا في أي وقت!' 
              : 'We are here to ensure you have the best learning experience. Feel free to reach out to us anytime!'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="support-card p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
              <Heart className="text-purple-400 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">{isAr ? 'رسالة لمستخدمينا' : 'Message to Our Users'}</h3>
            <p className="text-slate-400 leading-relaxed">
              {isAr 
                ? 'أنتم القلب النابض لـ QuizSpace. كل تعليق أو اقتراح منكم يساعدنا على التطور وتقديم أدوات ذكاء اصطناعي أفضل لمستقبلكم الدراسي. شكراً لثقتكم بنا!' 
                : 'You are the beating heart of QuizSpace. Every piece of feedback or suggestion from you helps us evolve and provide better AI tools for your academic future. Thank you for trusting us!'}
            </p>
          </div>

          <div className="support-card p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl hover:border-indigo-500/50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
              <ShieldCheck className="text-indigo-400 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">{isAr ? 'التزامنا بالجودة' : 'Our Commitment'}</h3>
            <p className="text-slate-400 leading-relaxed">
              {isAr 
                ? 'نلتزم بالرد على جميع استفساراتكم في أسرع وقت ممكن. فريقنا التقني يعمل على مدار الساعة لحل أي مشكلات تواجهونها.' 
                : 'We are committed to responding to all your inquiries as quickly as possible. Our technical team works around the clock to resolve any issues you encounter.'}
            </p>
          </div>
        </div>

        <div className="support-card p-8 rounded-3xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-white/20 backdrop-blur-2xl">
          <h2 className="text-2xl font-black mb-8 text-center">{isAr ? 'تواصل معنا مباشرة' : 'Contact Us Directly'}</h2>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a 
              href="mailto:youssefbadawy5002@gmail.com"
              className="contact-btn flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-slate-900 font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
            >
              <Mail className="w-5 h-5" />
              <span>youssefbadawy5002@gmail.com</span>
            </a>
            
            <a 
              href="tel:01018995002"
              className="contact-btn flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
            >
              <Phone className="w-5 h-5" />
              <span>01018995002</span>
            </a>

            <a 
              href="https://wa.me/201018995002"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-btn flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-emerald-600 text-white font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span>{isAr ? 'مدعوم بواسطة QuizSpace AI' : 'Powered by QuizSpace AI'}</span>
        </div>
      </div>
    </div>
  );
}
