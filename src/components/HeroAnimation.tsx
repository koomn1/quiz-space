import React, { useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { TextPlugin } from 'gsap/TextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Sparkles, BookOpen, GraduationCap, Brain, Layers, Target, Trophy } from 'lucide-react';

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger, TextPlugin);

interface HeroAnimationProps {
  t: any;
  isAr: boolean;
  onCreateQuizTab: () => void;
  cosmoAITopics?: string[];
}

export function HeroAnimation({ t, isAr, onCreateQuizTab, cosmoAITopics }: HeroAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const cosmoAITextRef = useRef<HTMLParagraphElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<(HTMLDivElement | null)[]>([]);
  const iconsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const mainTitle = isAr ? 'رحلة تعلم لا حدود لها' : 'A LEARNING WITHOUT LIMITS';
  
  const defaultTopics = isAr 
    ? ["تطوير المهارات العلمية", "استكشاف الكون العميق", "الذكاء الاصطناعي التوليدي"]
    : ["SKILL DEVELOPMENT", "DEEP UNIVERSE EXPLORATION", "GENERATIVE AI"];
    
  const topicsToUse = cosmoAITopics || defaultTopics;

  useGSAP(() => {
    // Note: orbs and floating icons used to animate infinitely (gsap.to with
    // repeat: -1) even when nobody was looking at the page — constant
    // transform+blur recompute every frame, forever. That's the main source
    // of the "heavy" feeling reported on the landing page. They're now
    // static decorative elements; only the one-time entrance animations
    // below (which finish and stop) remain.

    // Main Text Animation
    try {
      const split = new SplitText(headlineRef.current, { type: isAr ? 'words' : 'words,chars' });
      const staggerElements = isAr ? split.words : split.chars;
      // Keep the title visible even if the animation/plugin fails or the page is
      // opened on a slow connection. The entrance motion is only a subtle lift.
      gsap.fromTo(staggerElements,
        { opacity: 1, y: 12 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.035, ease: 'power3.out', delay: 0.02 }
      );
      
      // Note: this used to also run a continuous infinite "breathing" tween
      // on every single character forever, plus an infinite 15s background-
      // position scroll on the headline — both removed for the same reason
      // as the orbs/icons above. The one-time reveal above still plays.
    } catch (e) {
      gsap.set(headlineRef.current, { opacity: 1 });
      gsap.fromTo(headlineRef.current,
        { opacity: 1, y: 12, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' }
      );
    }

    if (cosmoAITextRef.current) {
      const firstTopic = topicsToUse[0] || '';
      const tl = gsap.timeline({ repeat: -1, delay: 0.4 });
      tl.set(cosmoAITextRef.current, { text: firstTopic });

      topicsToUse.forEach((topic, index) => {
        tl.to({}, { duration: index === 0 ? 2.4 : 2.8 })
          .to(cosmoAITextRef.current, { text: '', duration: Math.max(0.25, topic.length * 0.025), ease: 'none' });

        const nextTopic = topicsToUse[(index + 1) % topicsToUse.length] || firstTopic;
        tl.to(cosmoAITextRef.current, { text: nextTopic, duration: Math.max(0.35, nextTopic.length * 0.045), ease: 'none' });
      });
    }

    // Reveal Buttons
    gsap.fromTo(btnsRef.current,
      { opacity: 0, y: 12, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out', delay: 0.25 }
    );

  }, { scope: containerRef, dependencies: [isAr, topicsToUse.join('|')] });

  return (
    <div ref={containerRef} className="light-hero relative w-full h-[80vh] min-h-[600px] bg-[#020617] overflow-hidden flex flex-col items-center justify-center rounded-[40px] shadow-[0_20px_60px_-15px_rgba(109,40,217,0.3)] border border-indigo-500/20">
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e512_1px,transparent_1px),linear-gradient(to_bottom,#4f46e512_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        {/* Glowing Orbs - Diversified colors (Indigo, Emerald, Rose, Amber) */}
        <div ref={el => { orbsRef.current[0] = el; }} className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/25 blur-[120px] mix-blend-screen" />
        <div ref={el => { orbsRef.current[1] = el; }} className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/20 blur-[120px] mix-blend-screen" />
        <div ref={el => { orbsRef.current[2] = el; }} className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-rose-500/15 blur-[100px] mix-blend-screen" />
        <div ref={el => { orbsRef.current[3] = el; }} className="absolute bottom-[10%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-amber-500/10 blur-[110px] mix-blend-screen" />
        
        {/* Floating Educational & Achievement Icons (Removed Stars/Space theme) */}
        <div ref={el => { iconsRef.current[0] = el; }} className="absolute top-[15%] right-[15%] text-emerald-400/40"><GraduationCap size={56} /></div>
        <div ref={el => { iconsRef.current[1] = el; }} className="absolute bottom-[20%] left-[10%] text-indigo-400/40"><BookOpen size={72} /></div>
        <div ref={el => { iconsRef.current[2] = el; }} className="absolute top-[30%] left-[15%] text-rose-400/35"><Brain size={64} /></div>
        <div ref={el => { iconsRef.current[3] = el; }} className="absolute bottom-[30%] right-[10%] text-amber-400/35"><Trophy size={48} /></div>
        <div ref={el => { iconsRef.current[4] = el; }} className="absolute top-[10%] left-[40%] text-cyan-400/35"><Target size={40} /></div>
      </div>

      <div className="relative z-20 flex flex-col items-center text-center px-6 max-w-6xl w-full">
        <div className="perspective-[1000px] overflow-visible p-4 mb-2">
          <h1 
            ref={headlineRef} 
            className={`text-[10vw] sm:text-[7vw] md:text-[5rem] leading-[1.1] font-black text-slate-50 dark:text-white font-display ${isAr ? '' : 'tracking-tighter'}`}
            style={{ opacity: 1, textShadow: '0 10px 30px rgba(2, 6, 23, 0.55)' }}
          >
            {mainTitle}
          </h1>
        </div>
        
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5 min-h-[70px]">
          <span className="text-2xl md:text-5xl text-slate-300 font-bold drop-shadow-md">
            {isAr ? 'في مجال' : 'IN'}
          </span>
          <div className="flex items-center">
            <span 
              ref={cosmoAITextRef} 
              className={`text-2xl md:text-5xl text-emerald-300 font-black ${isAr ? "" : "tracking-wide"}`}
            >
            </span>
            <span className="ml-1 h-8 w-1 md:h-12 md:w-1.5 bg-emerald-300 motion-reduce:hidden animate-[pulse_0.8s_ease-in-out_infinite]" />
          </div>
        </div>

        <div ref={btnsRef} className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-6">
          <button
            onClick={onCreateQuizTab}
            className="group relative min-h-12 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-300 px-8 py-4 text-lg font-black tracking-wide text-slate-950 shadow-lg shadow-emerald-950/20 transition-transform duration-200 hover:scale-[1.02] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-3">
              <Sparkles className="w-6 h-6 animate-pulse" />
              {t.addQuizBtn}
            </span>
          </button>
          
          <button
            className="group min-h-12 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-lg font-bold tracking-wide text-white backdrop-blur-sm transition-colors duration-200 hover:border-white/45 hover:bg-white/15"
            onClick={() => {
              document.getElementById('quizzes-catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {isAr ? 'استكشف الاختبارات' : 'Explore Quizzes'}
          </button>
        </div>
      </div>
    </div>
  );
}
