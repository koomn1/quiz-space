import React from 'react';
import { Sparkles } from 'lucide-react';

interface AuroraLoaderProps {
  message?: string;
}

export default function AuroraLoader({ message = 'چاري تحليل البيانات بنفحات الشفق القطبي...' }: AuroraLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none select-none">
      
      {/* CSS Keyframes injected here for bulletproof Aurora Animations */}
      <style>{`
        @keyframes aurora-wash-1 {
          0% { transform: translate(-30%, -40%) scale(1) rotate(0deg); opacity: 0.6; }
          33% { transform: translate(10%, -20%) scale(1.3) rotate(120deg); opacity: 0.75; }
          66% { transform: translate(-10%, 20%) scale(0.9) rotate(240deg); opacity: 0.6; }
          100% { transform: translate(-30%, -40%) scale(1) rotate(360deg); opacity: 0.6; }
        }
        @keyframes aurora-wash-2 {
          0% { transform: translate(20%, 30%) scale(1.2) rotate(360deg); opacity: 0.5; }
          50% { transform: translate(-20%, -10%) scale(0.8) rotate(180deg); opacity: 0.7; }
          100% { transform: translate(20%, 30%) scale(1.2) rotate(0deg); opacity: 0.5; }
        }
        @keyframes aurora-wash-3 {
          0% { transform: translate(-40%, 20%) scale(0.9) rotate(0deg); opacity: 0.4; }
          50% { transform: translate(30%, -30%) scale(1.4) rotate(-180deg); opacity: 0.6; }
          100% { transform: translate(-40%, 20%) scale(0.9) rotate(-360deg); opacity: 0.4; }
        }
        .aurora-blur-1 {
          animation: aurora-wash-1 25s infinite ease-in-out;
        }
        .aurora-blur-2 {
          animation: aurora-wash-2 18s infinite ease-in-out;
        }
        .aurora-blur-3 {
          animation: aurora-wash-3 22s infinite ease-in-out;
        }
      `}</style>

      {/* Extreme Blurred Dynamic glowing blobs */}
      <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden mix-blend-screen pointer-events-none opacity-85 z-0">
        {/* Neon Teal Bloom */}
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-emerald-500/25 blur-[120px] aurora-blur-1" />
        
        {/* Cyber Green Bloom */}
        <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full bg-teal-400/20 blur-[130px] aurora-blur-2" />
        
        {/* Deep Cosmic Blue Bloom */}
        <div className="absolute top-[40%] right-[30%] w-[450px] h-[450px] rounded-full bg-blue-500/30 blur-[110px] aurora-blur-3" />
      </div>

      {/* Subtle organic Stars Field Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40 z-5" />

      {/* Interstellar Center Board Frame */}
      <div className="relative z-10 flex flex-col items-center max-w-lg p-8 mx-4 text-center space-y-6">
        
        {/* Sparkling Core Circle Loader */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Outer Rotating Neon Rings */}
          <div className="absolute inset-x-0 inset-y-0 border-2 border-t-emerald-400 border-r-teal-400 border-l-blue-400 border-b-transparent rounded-full animate-spin [animation-duration:1.5s]" />
          <div className="absolute inset-1 border border-b-blue-400 border-t-transparent rounded-full animate-spin [animation-direction:reverse] [animation-duration:3s]" />
          
          {/* Pulsing Core Sphere */}
          <div
            
            
            className="w-14 h-14 bg-linear-to-tr from-emerald-500 via-teal-400 to-blue-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          >
            <Sparkles className="w-7 h-7 text-white animate-pulse" />
          </div>
        </div>

        {/* Content Details */}
        <div className="space-y-3">
          <h3 
            
            
            className="font-display font-black text-xl sm:text-2xl text-transparent bg-clip-text bg-linear-to-l from-emerald-300 via-teal-200 to-blue-300 tracking-wide leading-relaxed drop-shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
          >
            {message}
          </h3>
          
          <p 
            
            
            
            className="text-[11px] text-emerald-300/60 uppercase tracking-widest font-mono animate-pulse"
          >
            Aurora System Analysis in Progress...
          </p>
        </div>
      </div>
    </div>
  );
}
