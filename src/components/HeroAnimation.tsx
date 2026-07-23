import React, { useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { TextPlugin } from 'gsap/TextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Sparkles, Star, Rocket, Cpu, Layers } from 'lucide-react';

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger, TextPlugin);

interface HeroAnimationProps {
  t: any;
  isAr: boolean;
  onCreateQuizTab: () => void;
  sparkTopics?: string[];
}

export function HeroAnimation({ t, isAr, onCreateQuizTab, sparkTopics }: HeroAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const sparkTextRef = useRef<HTMLParagraphElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<(HTMLDivElement | null)[]>([]);
  const iconsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const mainTitle = isAr ? 'رحلة تعلم لا حدود لها' : 'A LEARNING WITHOUT LIMITS';
  
  const defaultTopics = isAr 
    ? ["تطوير المهارات العلمية", "استكشاف الكون العميق", "الذكاء الاصطناعي التوليدي"]
    : ["SKILL DEVELOPMENT", "DEEP UNIVERSE EXPLORATION", "GENERATIVE AI"];
    
  const topicsToUse = sparkTopics || defaultTopics;

  useGSAP(() => {
    // Background orbs animation
    orbsRef.current.forEach((orb, i) => {
      gsap.to(orb, {
        x: "random(-150, 150)",
        y: "random(-150, 150)",
        rotation: "random(-180, 180)",
        scale: "random(0.8, 1.3)",
        duration: "random(6, 12)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: i * 0.5
      });
    });

    // Floating icons
    iconsRef.current.forEach((icon, i) => {
      gsap.to(icon, {
        y: "-=40",
        rotation: "random(-30, 30)",
        duration: "random(2.5, 4.5)",
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
        delay: i * 0.3
      });
    });

    // Main Text Animation
    try {
      const split = new SplitText(headlineRef.current, { type: isAr ? 'words' : 'words,chars' });
      const staggerElements = isAr ? split.words : split.chars;
      gsap.fromTo(staggerElements, 
        { 
          opacity: 0, 
          y: 100, 
          rotateX: -100,
          rotateY: 20, 
          scale: 0.5,
          filter: 'blur(15px)',
          transformOrigin: "50% 50% -50px"
        },
        { 
          opacity: 1, 
          y: 0, 
          rotateX: 0, 
          rotateY: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.8, 
          stagger: 0.05, 
          ease: 'elastic.out(1.2, 0.5)',
          delay: 0.2
        }
      );
      
      // Continuous luxurious floating/breathing effect
      gsap.to(staggerElements, {
        y: -12,
        rotationZ: "random(-1.5, 1.5)",
        duration: 3.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        stagger: {
          each: 0.1,
          from: "center",
          yoyo: true,
          repeat: -1
        },
        delay: 2
      });
      
      // Add a cool background shifting effect to the text
      gsap.to(headlineRef.current, {
        backgroundPosition: '200% center',
        duration: 15,
        ease: 'none',
        repeat: -1
      });
    } catch (e) {
      gsap.fromTo(headlineRef.current, 
        { opacity: 0, y: 50, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: 'back.out(1.5)' }
      );
    }

    // Type/Erase with GSAP TextPlugin
    if (sparkTextRef.current) {
      sparkTextRef.current.innerText = '';
      const tl = gsap.timeline({ repeat: -1, delay: 1 });

      topicsToUse.forEach((topic) => {
        tl.to(sparkTextRef.current, {
          text: topic,
          duration: topic.length * 0.1,
          ease: "none",
        })
        .to({}, { duration: 3 })
        .to(sparkTextRef.current, {
          text: "",
          duration: topic.length * 0.05,
          ease: "none",
        });
      });
    }

    // Reveal Buttons
    gsap.fromTo(btnsRef.current, 
      { opacity: 0, y: 40, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'elastic.out(1, 0.4)', delay: 1.8 }
    );

  }, { scope: containerRef, dependencies: [isAr, topicsToUse] });

  return (
    <div ref={containerRef} className="relative w-full h-[80vh] min-h-[600px] bg-[#020617] overflow-hidden flex flex-col items-center justify-center rounded-[40px] shadow-[0_20px_60px_-15px_rgba(109,40,217,0.3)] border border-indigo-500/20">
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e512_1px,transparent_1px),linear-gradient(to_bottom,#4f46e512_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        {/* Glowing Orbs */}
        <div ref={el => { orbsRef.current[0] = el; }} className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-600/30 blur-[120px] mix-blend-screen" />
        <div ref={el => { orbsRef.current[1] = el; }} className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#0ae448]/20 blur-[120px] mix-blend-screen" />
        <div ref={el => { orbsRef.current[2] = el; }} className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/20 blur-[100px] mix-blend-screen" />
        
        {/* Floating Icons */}
        <div ref={el => { iconsRef.current[0] = el; }} className="absolute top-[15%] right-[15%] text-[#0ae448]/50"><Sparkles size={56} /></div>
        <div ref={el => { iconsRef.current[1] = el; }} className="absolute bottom-[20%] left-[10%] text-violet-400/50"><Star size={72} /></div>
        <div ref={el => { iconsRef.current[2] = el; }} className="absolute top-[30%] left-[15%] text-cyan-400/40"><Rocket size={64} /></div>
        <div ref={el => { iconsRef.current[3] = el; }} className="absolute bottom-[30%] right-[10%] text-fuchsia-400/40"><Cpu size={48} /></div>
        <div ref={el => { iconsRef.current[4] = el; }} className="absolute top-[10%] left-[40%] text-amber-400/40"><Layers size={40} /></div>
      </div>

      <div className="relative z-20 flex flex-col items-center text-center px-6 max-w-6xl w-full">
        <div className="perspective-[1000px] overflow-visible p-4 mb-2">
          <h1 
            ref={headlineRef} 
            className={`text-[10vw] sm:text-[7vw] md:text-[5rem] leading-[1.1] font-black text-transparent bg-clip-text bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center font-display ${isAr ? '' : 'tracking-tighter'}`}
            style={{ 
              textShadow: '0 20px 40px rgba(0,0,0,0.6)',
              WebkitTextStroke: '2px rgba(255,255,255,1)' 
            }}
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
              ref={sparkTextRef} 
              className={`text-2xl md:text-5xl text-[#0ae448] font-black ${isAr ? "" : "tracking-wide"}`}
              style={{ textShadow: '0 0 30px rgba(10,228,72,0.5)' }}
            >
            </span>
            <span className="w-1 md:w-1.5 h-8 md:h-12 bg-[#0ae448] ml-1 animate-[pulse_0.8s_ease-in-out_infinite]" />
          </div>
        </div>

        <div ref={btnsRef} className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-6">
          <button
            onClick={onCreateQuizTab}
            className="group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-[#0ae448] via-emerald-400 to-cyan-400 text-slate-950 font-black text-xl tracking-wide transition-all duration-300 hover:scale-110 shadow-[0_0_50px_rgba(10,228,72,0.5)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-3">
              <Sparkles className="w-6 h-6 animate-pulse" />
              {t.addQuizBtn}
            </span>
          </button>
          
          <button
            className="group px-10 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border-2 border-indigo-500/30 hover:border-indigo-400/60 text-white font-bold text-xl tracking-wide transition-all duration-300 hover:scale-105 backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.2)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]"
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
