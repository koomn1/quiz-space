import React from 'react';

interface CosmicLogoProps {
  className?: string;
  animate?: boolean;
}

export default function CosmicLogo({ className = "w-12 h-12", animate = true }: CosmicLogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          @keyframes logoBob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
          @keyframes logoTilt {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(4deg); }
          }
          @keyframes logoPulse {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.04); opacity: 1; }
          }
          .logo-bob {
            animation: logoBob 4s ease-in-out infinite;
            transform-origin: center;
          }
          .logo-tilt {
            animation: ${animate ? 'logoTilt 6s ease-in-out infinite' : 'none'};
            transform-origin: center;
          }
          .logo-pulse {
            animation: ${animate ? 'logoPulse 3.5s ease-in-out infinite' : 'none'};
            transform-origin: center;
          }
        `}
      </style>
      
      <defs>
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="16" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="cosmicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>

      {/* Tilt group */}
      <g className="logo-tilt">
        
        {/* Glow circle */}
        <circle 
          cx="245" 
          cy="235" 
          r="122" 
          fill="#3b82f6" 
          opacity="0.08" 
          filter="url(#logoGlow)" 
        />
        
        {/* Bobbing group */}
        <g className="logo-bob">
          {/* Main outer planetary orbit pathway ring */}
          <ellipse 
            cx="245" 
            cy="235" 
            rx="145" 
            ry="60" 
            stroke="url(#cosmicGrad)" 
            strokeWidth="3.5" 
            fill="none" 
            transform="rotate(-20 245 235)" 
            strokeDasharray="16 10"
            opacity="0.65" 
            filter="url(#logoGlow)"
          />

          {/* Planetary satellite circle */}
          <g transform="rotate(-20 245 235)">
            <circle cx="390" cy="235" r="8" fill="#fef08a" filter="url(#logoGlow)" />
            <circle cx="100" cy="235" r="5" fill="#a78bfa" filter="url(#logoGlow)" />
          </g>

          {/* Main outer logo ring */}
          <circle 
            cx="245" 
            cy="235" 
            r="105" 
            stroke="url(#cosmicGrad)" 
            strokeWidth="11" 
            filter="url(#logoGlow)"
          />
          
          {/* Inner pulse group representing the glowing mind / quiz core */}
          <g className="logo-pulse">
            <circle 
              cx="245" 
              cy="235" 
              r="68" 
              fill="url(#cosmicGrad)" 
              opacity="0.15" 
            />
            
            {/* Elegant inner orbital ring */}
            <path 
              d="M 152,235 C 175,188 315,188 338,235 C 315,282 175,282 152,235" 
              fill="none" 
              stroke="#c084fc" 
              strokeWidth="5" 
              strokeLinecap="round"
              filter="url(#logoGlow)"
            />
            
            {/* The Question Mark Center Piece "?" */}
            <text 
              x="245" 
              y="266" 
              fontFamily="system-ui, sans-serif" 
              fontSize="90" 
              fontWeight="900" 
              fill="#ffffff" 
              textAnchor="middle"
              filter="url(#logoGlow)"
            >
              ?
            </text>
          </g>

          {/* Little elegant stars / dots orbiting */}
          <circle cx="150" cy="145" r="5" fill="#fef08a" />
          <circle cx="340" cy="325" r="4" fill="#60a5fa" />
          <circle cx="335" cy="135" r="4.5" fill="#f472b6" />
          <circle cx="245" cy="65" r="6" fill="#fb7185" filter="url(#logoGlow)" />
          <circle cx="215" cy="380" r="4" fill="#34d399" />
        </g>
      </g>
    </svg>
  );
}
