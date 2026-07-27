import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface FeatureScrollRevealProps {
  features: { title: string; desc: string }[];
  isAr?: boolean;
}

export function FeatureScrollReveal({ features, isAr }: FeatureScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const panels = gsap.utils.toArray('.feature-panel');
    
    gsap.to(panels, {
      xPercent: (isAr ? 100 : -100) * (panels.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        pin: true,
        scrub: 1,
        snap: 1 / (panels.length - 1),
        end: () => "+=" + containerRef.current!.offsetWidth,
      }
    });

    // Animate content inside panels
    panels.forEach((panel: any, i) => {
      const title = panel.querySelector('.feature-title');
      const desc = panel.querySelector('.feature-desc');
      
      gsap.fromTo(title, 
        { y: 50, opacity: 0 },
        { 
          y: 0, opacity: 1, 
          scrollTrigger: {
            trigger: panel,
            containerAnimation: gsap.getById("scrollTween"),
            start: "left center",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="w-full h-screen flex overflow-hidden bg-slate-900 rounded-3xl mb-24">
      {features.map((f, i) => (
        <div key={i} className="feature-panel w-full h-full flex-shrink-0 flex items-center justify-center p-10 relative">
          {/* Background element */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#0ae448]/5 rounded-full blur-[80px]" />
          
          <div className="max-w-2xl text-center relative z-10">
            <h2 className="feature-title text-[8vw] sm:text-[4rem] font-black text-white uppercase tracking-tighter mb-6">
              {f.title}
            </h2>
            <p className="feature-desc text-xl md:text-2xl text-slate-300">
              {f.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
