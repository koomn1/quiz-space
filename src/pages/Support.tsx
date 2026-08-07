import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Shield, Zap, Star, Headphones, Sparkles, MessageSquare, ExternalLink, Mail, Phone } from 'lucide-react';

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

  const contactChannels = [
    {
      title: isAr ? 'محادثة واتساب الفورية' : 'WhatsApp Instant Chat',
      value: '+20 101 899 5002',
      link: 'https://wa.me/201018995002',
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      desc: isAr ? 'تواصل معنا مباشرة عبر واتساب للرد السريع وحل أي استفسار فني أو أكاديمي.' : 'Chat with us directly on WhatsApp for immediate support and assistance.',
      brandSvg: (
        <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      )
    },
    {
      title: isAr ? 'البريد الإلكتروني الرسمي' : 'Official Email',
      value: 'youssefbadawy5002@gmail.com',
      link: 'mailto:youssefbadawy5002@gmail.com',
      color: 'from-blue-500 to-indigo-600',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      desc: isAr ? 'راسلنا في أي وقت للاستفسارات الرسمية والشراكات الأكاديمية وسنرد خلال 24 ساعة.' : 'Email us for formal inquiries and academic partnerships. We reply within 24 hours.',
      brandSvg: (
        <Mail className="w-8 h-8 text-white" />
      )
    },
    {
      title: isAr ? 'الدعم الهاتفي المباشر' : 'Direct Phone Support',
      value: '+20 101 899 5002',
      link: 'tel:01018995002',
      color: 'from-purple-500 to-violet-600',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      desc: isAr ? 'فريق الدعم الفني جاهز لاستقبال مكالماتكم واستفساراتكم العاجلة طوال أيام الأسبوع.' : 'Our technical support team is ready to take your urgent calls throughout the week.',
      brandSvg: (
        <Phone className="w-8 h-8 text-white" />
      )
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 transition-colors duration-500 relative overflow-hidden">
      {/* Background glowing ambient effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="support-header text-center mb-16">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-3xl mb-6 text-white shadow-xl shadow-purple-600/20">
            <Headphones className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            {isAr ? 'مركز الدعم الفني والخدمات' : 'Support & Assistance Hub'}
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            {isAr 
              ? 'نحن هنا لضمان حصولك على أفضل تجربة تعليمية متميزة في QuizSpace. تواصل مع فريقنا الاحترافي في أي وقت.' 
              : 'We are here to ensure you get the best educational experience in QuizSpace. Connect with our professional team anytime.'}
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { icon: <Shield className="w-6 h-6 text-purple-400" />, title: isAr ? 'حماية وأمان تام' : 'Secure & Private', desc: isAr ? 'بياناتك الشخصية وتعليمك محمية وفق أعلى معايير الأمان.' : 'Your personal data and learning stats are protected.' },
            { icon: <Zap className="w-6 h-6 text-amber-400" />, title: isAr ? 'استجابة فائقة السرعة' : 'Lightning Fast', desc: isAr ? 'فريق دعم متواجد لخدمتك وحل مشاكلك في أسرع وقت ممكن.' : 'Our support team is always ready to resolve your issues.' },
            { icon: <Star className="w-6 h-6 text-rose-400" />, title: isAr ? 'خدمة VIP مميزة' : 'VIP Service', desc: isAr ? 'نولي اهتماماً خاصاً بكل تفاصيل رحلتك الأكاديمية معنا.' : 'We care about every detail of your academic journey.' }
          ].map((feat, i) => (
            <div key={i} className="support-card p-8 bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-800 shadow-xl hover:border-purple-500/40 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-6 shadow-inner">
                {feat.icon}
              </div>
              <h3 className="text-xl font-black text-white mb-3">{feat.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Contact Channels Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {contactChannels.map((channel, idx) => (
            <a 
              key={idx} 
              href={channel.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="support-card group relative overflow-hidden p-8 bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-slate-800 shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between"
            >
              <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${channel.color} opacity-10 blur-3xl -mr-20 -mt-20 group-hover:opacity-25 transition-opacity duration-500`} />
              
              <div>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${channel.color} text-white flex items-center justify-center mb-6 shadow-xl shadow-purple-600/20 group-hover:scale-110 transition-transform duration-300`}>
                  {channel.brandSvg}
                </div>
                
                <h3 className="text-2xl font-black text-white mb-3 group-hover:text-purple-400 transition-colors">
                  {channel.title}
                </h3>
                
                <p className="text-sm text-slate-400 mb-8 leading-relaxed font-medium">
                  {channel.desc}
                </p>
              </div>
              
              <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200 font-mono tracking-wide">
                  {channel.value}
                </span>
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center group-hover:bg-purple-600 transition-colors shadow-md">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Footer Text */}
        <div className="support-footer text-center border-t border-slate-900 pt-10">
          <p className="text-slate-500 text-sm font-bold tracking-wide">
            {isAr ? '© 2026 QuizSpace - صنع بكل حب لدعم رحلتك التعليمية في العالم العربي ❤️' : '© 2026 QuizSpace - Made with love to support your learning journey ❤️'}
          </p>
        </div>
      </div>
    </div>
  );
}
