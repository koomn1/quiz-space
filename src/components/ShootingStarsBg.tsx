import React, { useState, useEffect } from 'react';

interface ShootingStarsBgProps {
  mode?: string; // 'cosmic' | 'sunrise' | 'nebula' | 'aurora'
}

export function ShootingStarsBg({ mode = 'cosmic' }: ShootingStarsBgProps) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Detect initial theme
    setIsDark(document.documentElement.classList.contains('dark'));

    // Create mutation observer to listen to class changes on the root html element
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        /* ROTATION ANIMATIONS IN OPPOSITE DIRECTIONS */
        @keyframes spin-clockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-counter-clockwise {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        .spin-cw-slow {
          animation: spin-clockwise 40s linear infinite;
        }
        .spin-ccw-medium {
          animation: spin-counter-clockwise 24s linear infinite;
        }
        .spin-cw-fast {
          animation: spin-clockwise 15s linear infinite;
        }
        .spin-ccw-slow {
          animation: spin-counter-clockwise 50s linear infinite;
        }

        /* SHOOTING STARS DEEP SPACE SYSTEM (DARK MODE) */
        .shooting-stars-night {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: rotateZ(45deg);
          animation: shooting-stars-sky 20s linear infinite;
          overflow: hidden;
          z-index: 0;
          border-radius: inherit;
        }

        .shooting-stars-night .shooting_star {
          position: absolute;
          left: 50%;
          top: 50%;
          height: 2px;
          background: linear-gradient(-45deg, #7af5ff, rgba(0,0,255,0));
          border-radius: 999px;
          filter: drop-shadow(0 0 6px #7af5ff);
          animation:
            shooting-stars-tail 3s ease-in-out infinite,
            shooting-stars-shooting 3s ease-in-out infinite;
        }

        .shooting-stars-night .shooting_star::before,
        .shooting-stars-night .shooting_star::after {
          content: "";
          position: absolute;
          top: calc(50% - 1px);
          right: 0;
          height: 2px;
          width: 20px;
          background: linear-gradient(-45deg, rgba(0,0,255,0), #7af5ff, rgba(0,0,255,0));
          border-radius: 100%;
        }

        .shooting-stars-night .shooting_star:nth-child(1) {
          top: 20%;
          left: 20%;
          animation-delay: 0s;
        }

        .shooting-stars-night .shooting_star:nth-child(2) {
          top: 40%;
          left: 60%;
          animation-delay: 1s;
        }

        .shooting-stars-night .shooting_star:nth-child(3) {
          top: 70%;
          left: 35%;
          animation-delay: 2s;
        }

        @keyframes shooting-stars-tail {
          0% { width: 0; }
          30% { width: 100px; }
          100% { width: 0; }
        }

        @keyframes shooting-stars-shooting {
          0% { transform: translateX(0); }
          100% { transform: translateX(300px); }
        }

        @keyframes shooting-stars-sky {
          0% { transform: rotate(45deg); }
          100% { transform: rotate(405deg); }
        }

        /* SUNRISE & SOARING BIRDS SYSTEM (LIGHT MODE) */
        .bird-group {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 5;
          border-radius: inherit;
        }

        .flying-bird {
          position: absolute;
          animation: fly-across linear infinite;
        }

        .flying-bird-1 {
          top: 20%;
          transform: scale(0.5);
          animation-duration: 22s;
          animation-delay: 0s;
        }

        .flying-bird-2 {
          top: 35%;
          transform: scale(0.35);
          animation-duration: 32s;
          animation-delay: 4s;
        }

        .flying-bird-3 {
          top: 10%;
          transform: scale(0.45);
          animation-duration: 19s;
          animation-delay: 8s;
        }

        .flying-bird-4 {
          top: 50%;
          transform: scale(0.3);
          animation-duration: 26s;
          animation-delay: 12s;
        }

        @keyframes fly-across {
          0% { left: -15%; }
          100% { left: 115%; }
        }

        .bird-wing-flap {
          animation: wing-flap-keyframes 0.45s ease-in-out infinite alternate;
          transform-origin: center;
        }

        @keyframes wing-flap-keyframes {
          0% { transform: scaleY(1.1) translateY(0); }
          100% { transform: scaleY(0.2) translateY(-4px); }
        }

        .cloud-slow-float {
          animation: cloud-float 45s ease-in-out infinite alternate;
        }

        @keyframes cloud-float {
          0% { transform: translateX(-20px); opacity: 0.25; }
          100% { transform: translateX(30px); opacity: 0.45; }
        }
      `}</style>

      {/* Render selected preset background */}
      {(() => {
        // 1. SUNRISE PRESET
        if (mode === 'sunrise') {
          return (
            <div 
              className="absolute inset-0 bg-gradient-to-b from-sky-300 via-amber-100 to-amber-50/50 overflow-hidden rounded-3xl transition-all duration-700" 
              style={{ zIndex: 0 }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_100%,rgba(253,224,71,0.45)_0%,rgba(253,186,116,0.15)_60%,transparent_100%)]"></div>

              {/* Sunrise Sun */}
              <div className="absolute bottom-[-15px] left-[65%] w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-t from-yellow-300 to-amber-400 opacity-90 blur-[0.5px] shadow-[0_0_50px_rgba(245,158,11,0.65),0_0_100px_rgba(253,224,71,0.4)] animate-pulse"></div>

              {/* Vector clouds drifting in opposite directions */}
              <div className="absolute top-[10%] left-[20%] w-24 h-8 bg-white/75 rounded-full blur-[1px] cloud-slow-float"></div>
              <div className="absolute top-[25%] left-[5%] w-32 h-10 bg-white/55 rounded-full blur-[2px] cloud-slow-float" style={{ animationDelay: '5s' }}></div>
              <div className="absolute top-[15%] left-[55%] w-40 h-12 bg-white/60 rounded-full blur-[1px] cloud-slow-float" style={{ animationDelay: '10s' }}></div>

              {/* Birds group flying across */}
              <div className="bird-group">
                <div className="flying-bird flying-bird-1">
                  <svg viewBox="0 0 100 80" className="w-16 h-12 text-slate-600/75">
                    <path className="bird-wing-flap" fill="currentColor" d="M50,40 C35,15 12,20 0,32 C15,32 35,38 50,45 C65,38 85,32 100,32 C88,20 65,15 50,40 Z" />
                  </svg>
                </div>
                <div className="flying-bird flying-bird-2">
                  <svg viewBox="0 0 100 80" className="w-16 h-12 text-slate-600/75">
                    <path className="bird-wing-flap" fill="currentColor" d="M50,40 C35,15 12,20 0,32 C15,32 35,38 50,45 C65,38 85,32 100,32 C88,20 65,15 50,40 Z" />
                  </svg>
                </div>
                <div className="flying-bird flying-bird-3">
                  <svg viewBox="0 0 100 80" className="w-16 h-12 text-slate-500/75">
                    <path className="bird-wing-flap" fill="currentColor" d="M50,40 C35,15 12,20 0,32 C15,32 35,38 50,45 C65,38 85,32 100,32 C88,20 65,15 50,40 Z" />
                  </svg>
                </div>
                <div className="flying-bird flying-bird-4">
                  <svg viewBox="0 0 100 80" className="w-16 h-12 text-slate-400/70">
                    <path className="bird-wing-flap" fill="currentColor" d="M50,40 C35,15 12,20 0,32 C15,32 35,38 50,45 C65,38 85,32 100,32 C88,20 65,15 50,40 Z" />
                  </svg>
                </div>
              </div>
            </div>
          );
        }

        // 2. EMERALD AURORA PRESET
        if (mode === 'aurora') {
          return (
            <div 
              className="absolute inset-0 bg-gradient-to-br from-teal-950 via-emerald-950 to-slate-950 overflow-hidden rounded-3xl" 
              style={{ zIndex: 0 }}
            >
              {/* Aurora waves and opposite rotating nebula cores */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.25)_0%,transparent_70%)] animate-pulse" style={{ animationDuration: '8s' }}></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18)_0%,transparent_60%)]"></div>
              
              {/* Spinning Nebula 1: Clockwise-slow */}
              <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl spin-cw-slow" />
              
              {/* Spinning Nebula 2: Counter-clockwise medium */}
              <div className="absolute bottom-[-50px] right-[10%] w-72 h-72 rounded-full bg-teal-500/8 blur-3xl spin-ccw-medium" />

              {/* Secondary spinning component: clockwise fast with low capacity */}
              <div className="absolute top-[20%] right-[25%] w-40 h-40 rounded-full bg-emerald-400/5 blur-2xl spin-cw-fast" />

              {/* Floating stars */}
              <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-white rounded-full animate-ping" />
              <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-emerald-200 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
            </div>
          );
        }

        // 3. MAGIC AMETHYST NEBULA PRESET
        if (mode === 'nebula') {
          return (
            <div 
              className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-violet-950 overflow-hidden rounded-3xl" 
              style={{ zIndex: 0 }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.22)_0%,transparent_60%)]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.15)_0%,transparent_50%)]"></div>

              {/* Orbiting space system cores rotating in opposite directions */}
              {/* Purple Swirl Core: Clockwise Slow */}
              <div className="absolute -top-20 right-[5%] w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl spin-cw-slow" />

              {/* Magenta Swirl Core: Counter-Clockwise Medium */}
              <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-pink-500/12 blur-3xl spin-ccw-medium" />

              {/* Fast core cluster: Counter-Clockwise Slow */}
              <div className="absolute top-[30%] left-[45%] w-36 h-36 rounded-full bg-violet-600/8 blur-2xl spin-ccw-slow" />

              {/* Twinkling galaxy sparks */}
              <div className="absolute top-10 left-[20%] w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse" />
              <div className="absolute bottom-12 right-[40%] w-1 h-1 bg-pink-200 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
          );
        }

        // 4. DEFAULT: COSMIC BLUE SPACE PRESET
        return (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#0b1d51_0%,#000814_100%)] overflow-hidden rounded-3xl" style={{ zIndex: 0 }}>
            {/* Background elements spinning in opposite directions */}
            {/* Blue Deep Core: Clockwise Slow */}
            <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl spin-cw-slow" />
            
            {/* Cyan Accent Core: Counter-clockwise Medium */}
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl spin-ccw-medium" />

            <div className="shooting-stars-night">
              <div className="shooting_star"></div>
              <div className="shooting_star"></div>
              <div className="shooting_star"></div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
