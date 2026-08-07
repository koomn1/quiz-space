import React from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Mail, Phone, MessageCircle, Heart } from 'lucide-react';

interface ContactFooterProps {
  lang: 'ar' | 'en';
}

export default function ContactFooter({ lang }: ContactFooterProps) {
  const isAr = lang === 'ar';
  const footerRef = React.useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(".footer-content", 
      { opacity: 0, y: 50 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 1, 
        ease: 'power3.out',
        scrollTrigger: {
          trigger: footerRef.current,
          start: 'top 90%',
        }
      }
    );
  }, { scope: footerRef });

  return (
    <div ref={footerRef} className="mt-20 pb-12 px-4">
      <div className="footer-content max-w-5xl mx-auto rounded-[2.5rem] bg-gradient-to-br from-slate-900/80 to-indigo-950/80 border border-white/10 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="text-center md:text-right flex-1" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
            <h2 className="text-3xl sm:text-4xl font-black mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              {isAr ? 'هل تحتاج إلى مساعدة؟' : 'Need help?'}
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto md:mx-0">
              {isAr 
                ? 'فريق الدعم الفني متواجد دائماً للإجابة على استفساراتكم ومساعدتكم في رحلتكم التعليمية.' 
                : 'Our support team is always here to answer your questions and help you on your educational journey.'}
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <a 
                href="mailto:youssefbadawy5002@gmail.com"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <Mail className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold">youssefbadawy5002@gmail.com</span>
              </a>
              <a 
                href="tel:01018995002"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <Phone className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold">01018995002</span>
              </a>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 animate-pulse">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            <a 
              href="https://wa.me/201018995002"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
            >
              {isAr ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
            <span>{isAr ? 'صنع بكل' : 'Made with'}</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>{isAr ? 'من أجل مستقبلكم' : 'for your future'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
