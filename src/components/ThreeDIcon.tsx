import React, { useState } from 'react';

interface ThreeDIconProps {
  name: string;
  className?: string;
  size?: number | string;
}

export default function ThreeDIcon({ name, className = "w-5 h-5", size }: ThreeDIconProps) {
  const normName = name.toLowerCase().trim();
  const [imgFailed, setImgFailed] = useState(false);

  // Map the application's icon keys directly to the exact file names uploaded by the user
  let filename = normName;
  if (normName === 'dashboard' || normName === 'home') {
    filename = 'globe';
  } else if (normName === 'profile' || normName === 'user' || normName === 'avatar') {
    filename = 'settings-head';
  } else if (normName === 'categories' || normName === 'layers' || normName === 'classifications') {
    filename = 'purple-tag';
  } else if (normName === 'community' || normName === 'users') {
    filename = 'people';
  } else if (normName === 'messages' || normName === 'messagesquare') {
    filename = 'purple-bubbles';
  } else if (normName === 'bookmarks' || normName === 'bookmark') {
    filename = 'purple-tag';
  } else if (normName === 'achievements') {
    filename = 'badge-ribbon-star';
  } else if (normName === 'create') {
    filename = 'plus-circle';
  } else if (normName === 'settings') {
    filename = 'settings-gear';
  } else if (normName === 'billing') {
    filename = 'credit-card';
  } else if (normName === 'logout') {
    filename = 'delete';
  } else if (normName === 'cosmobot' || normName === 'cosmo') {
    filename = 'cosmobot-artificial'; // intentionally non-existent to trigger beautiful 3D SVG vector fallback
  } else if (normName === 'support') {
    filename = 'support-headset';
  } else if (normName === 'fire' || normName === 'zap') {
    filename = 'flame';
  }

  // Pre-configured paths for development and deployed structures
  const imageSrc = `/src/assets/images/${filename}.png`;

  if (!imgFailed) {
    return (
      <img
        src={imageSrc}
        alt={filename}
        className={`${className} object-contain transition-transform duration-200 hover:scale-110`}
        style={size ? { width: size, height: size } : undefined}
        onError={() => setImgFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Common gradients and styles so we don't repeat them
  const defs = (
    <defs>
      {/* Filters for 3D metallic of glassmorphic glow */}
      <filter id="glowDraft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="softShadow3D" x="-10%" y="-10%" width="125%" height="135%">
        <feDropShadow dx="1.5" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.45" />
      </filter>
      <filter id="intenseShadow3D" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="2" dy="5" stdDeviation="4.5" floodColor="#000000" floodOpacity="0.65" />
      </filter>

      {/* Gradients precisely mimicking the attached design */}
      {/* 1. Purple & Violet (Settings / Hearts / Links) */}
      <linearGradient id="purpleGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e879f9" />
        <stop offset="50%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      
      {/* 2. Orange & Yellow (Taxi / Support Headset / Info Bubble / Calendars) */}
      <linearGradient id="orangeGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="45%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>

      {/* 3. Blue & Cyan (Globe / Play Button / Clouds) */}
      <linearGradient id="blueGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>

      {/* 4. Green & Mint (Download / Check badges / Cash Bag) */}
      <linearGradient id="greenGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>

      {/* 5. Gold Gloss (Crowns / Trophy) */}
      <linearGradient id="goldGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="35%" stopColor="#facc15" />
        <stop offset="75%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>

      {/* 6. Crimson & Soft Pink (Hearts / Instagram accent) */}
      <linearGradient id="pinkGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="60%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#be185d" />
      </linearGradient>

      {/* 7. Gloss White/Glass */}
      <linearGradient id="glassGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="40%" stopColor="#f1f5f9" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.1" />
      </linearGradient>

      {/* 8. Instagram Multi-gradient (as shown in user illustration) */}
      <radialGradient id="instaGrad3D" cx="30%" cy="100%" r="100%">
        <stop offset="0%" stopColor="#fecdd3" />
        <stop offset="25%" stopColor="#fb7185" />
        <stop offset="50%" stopColor="#ec4899" />
        <stop offset="75%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#3b82f6" />
      </radialGradient>
    </defs>
  );

  let iconContent = null;

  switch (normName) {
    case 'billing':
    case 'payments':
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Card Base */}
          <rect x="50" y="100" width="400" height="300" rx="40" fill="url(#purpleGrad3D)" stroke="#ffffff" strokeWidth="10" />
          {/* Magnetic Strip */}
          <rect x="50" y="170" width="400" height="70" fill="#0f172a" />
          {/* Chip */}
          <rect x="100" y="270" width="100" height="70" rx="15" fill="url(#goldGrad3D)" stroke="#ffffff" strokeWidth="4" />
          {/* Internal Chip Details */}
          <line x1="150" y1="270" x2="150" y2="340" stroke="#78350f" strokeWidth="4" />
          <line x1="100" y1="305" x2="200" y2="305" stroke="#78350f" strokeWidth="4" />
          {/* Brand circles */}
          <circle cx="340" cy="305" r="40" fill="url(#orangeGrad3D)" opacity="0.9" />
          <circle cx="390" cy="305" r="40" fill="url(#pinkGrad3D)" opacity="0.8" />
        </g>
      );
      break;

    case 'cosmobot':
    case 'cosmo':
    case 'chatbot':
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Cybernetic head casing */}
          <circle cx="250" cy="250" r="185" fill="url(#purpleGrad3D)" stroke="#ffffff" strokeWidth="8" />
          <circle cx="250" cy="250" r="145" fill="url(#blueGrad3D)" />
          {/* Glowing visor screen */}
          <ellipse cx="250" cy="220" rx="90" ry="30" fill="#0f172a" stroke="#475569" strokeWidth="3" />
          {/* Dual cyber glowing pupils */}
          <circle cx="205" cy="220" r="16" fill="#38bdf8" filter="url(#glowDraft)" />
          <circle cx="205" cy="220" r="6" fill="#ffffff" />
          <circle cx="295" cy="220" r="16" fill="#38bdf8" filter="url(#glowDraft)" />
          <circle cx="295" cy="220" r="6" fill="#ffffff" />
          {/* Cosmo high-tech antenna */}
          <line x1="250" y1="105" x2="250" y2="40" stroke="url(#goldGrad3D)" strokeWidth="14" strokeLinecap="round" />
          <circle cx="250" cy="35" r="22" fill="url(#pinkGrad3D)" filter="url(#glowDraft)" stroke="#ffffff" strokeWidth="3" />
          {/* Animated smiley mouth */}
          <path d="M 185,290 Q 250,345 315,290" fill="none" stroke="#34d399" strokeWidth="8" strokeLinecap="round" />
          {/* Microchips glowing dots */}
          <circle cx="150" cy="140" r="8" fill="#fbbf24" opacity="0.8" />
          <circle cx="350" cy="140" r="8" fill="#e879f9" opacity="0.8" />
        </g>
      );
      break;

    case 'home':
    case 'dashboard':
      // 3D styled House rendering with volumetric depth
      iconContent = (
        <g filter="url(#softShadow3D)">
          {/* Base bottom depth */}
          <path d="M12 40 L380 40 L380 440 L12 440 Z" fill="#1e293b" opacity="0.3" />
          {/* Back wall shadow */}
          <polygon points="100,240 250,110 400,240 400,420 100,420" fill="url(#blueGrad3D)" opacity="0.8" />
          {/* Main 3D isometric house front */}
          <path d="M120,240 L250,130 L380,240 L380,410 L120,410 Z" fill="url(#purpleGrad3D)" />
          {/* Main Roof 3D */}
          <polygon points="90,250 250,100 410,250 410,225 250,80 90,225" fill="url(#orangeGrad3D)" />
          {/* Front Glowing Door */}
          <rect x="210" y="290" width="80" height="120" rx="10" fill="url(#goldGrad3D)" stroke="#ffffff" strokeWidth="4" />
          {/* Rounded window on top */}
          <circle cx="250" cy="200" r="24" fill="#ffffff" opacity="0.85" />
          <line x1="250" y1="176" x2="250" y2="224" stroke="#475569" strokeWidth="3" />
          <line x1="226" y1="200" x2="274" y2="200" stroke="#475569" strokeWidth="3" />
        </g>
      );
      break;

    case 'profile':
    case 'user':
    case 'avatar':
      // 3D round Avatar face shape as seen in support headset/yellow head in prompt
      iconContent = (
        <g filter="url(#softShadow3D)">
          {/* Circular gloss background */}
          <circle cx="250" cy="250" r="210" fill="url(#purpleGrad3D)" opacity="0.2" />
          {/* 3D collar outline */}
          <path d="M 120,410 C 120,320 170,290 250,290 C 330,290 380,320 380,410 Z" fill="url(#blueGrad3D)" />
          {/* 3D Head */}
          <circle cx="250" cy="180" r="100" fill="url(#orangeGrad3D)" />
          {/* Glossy highlight representing light reflection on 3D face */}
          <ellipse cx="230" cy="130" rx="35" ry="18" fill="#ffffff" opacity="0.45" transform="rotate(-15, 230, 130)" />
          {/* Little Crown on top of profile of premium VIP users */}
          <path d="M 210,95 L 225,65 L 250,85 L 275,65 L 290,95 Z" fill="url(#goldGrad3D)" />
          <circle cx="250" cy="85" r="5" fill="#ffffff" />
        </g>
      );
      break;

    case 'explore':
    case 'compass':
    case 'globe':
      // Stunning 3D Tech Globe with white mouse cursor mouse click (exactly matching the user image)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Background aura circle */}
          <circle cx="250" cy="250" r="200" fill="url(#blueGrad3D)" opacity="0.15" />
          {/* Main big 3D globe sphere */}
          <circle cx="250" cy="250" r="170" fill="url(#blueGrad3D)" />
          {/* Shading layer for volumetric 3D spherical look */}
          <circle cx="250" cy="250" r="170" fill="url(#glassGrad3D)" opacity="0.5" />
          
          {/* Latitude Lines */}
          <ellipse cx="250" cy="250" rx="170" ry="60" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.5" />
          <ellipse cx="250" cy="250" rx="170" ry="110" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.3" />
          
          {/* Longitude Lines */}
          <ellipse cx="250" cy="250" rx="60" ry="170" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.5" />
          <ellipse cx="250" cy="250" rx="110" ry="170" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.3" />

          {/* Equator & Prime Meridian axes */}
          <line x1="80" y1="250" x2="420" y2="250" stroke="#ffffff" strokeWidth="7" opacity="0.6" />
          <line x1="250" y1="80" x2="250" y2="420" stroke="#ffffff" strokeWidth="7" opacity="0.6" />

          {/* 3D Mouse pointer cursor pointing at the globe */}
          <g transform="translate(300, 260) scale(1.1)" filter="url(#softShadow3D)">
            {/* Cursor Body */}
            <polygon 
              points="0,0 120,40 70,70 120,130 90,140 40,80 10,110" 
              fill="#ffffff" 
              stroke="#1e293b" 
              strokeWidth="9" 
              strokeLinejoin="round" 
            />
            {/* Cursor inner shine */}
            <polygon points="12,12 100,42 62,56 100,105 84,111 44,60 18,84" fill="#f1f5f9" />
          </g>
        </g>
      );
      break;

    case 'categories':
    case 'layers':
    case 'classifications':
      // Gorgeous 3D stacked translucent glowing floating panels, styled from 'layers' icon
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Bottom Layer */}
          <g transform="translate(0, 110)">
            <polygon points="250,140 430,220 250,300 70,220" fill="url(#blueGrad3D)" opacity="0.4" />
            <polygon points="250,140 430,220 250,300 70,220" fill="none" stroke="#3b82f6" strokeWidth="6" />
          </g>
          {/* Middle Layer */}
          <g transform="translate(0, 50)">
            <polygon points="250,140 430,220 250,300 70,220" fill="url(#purpleGrad3D)" opacity="0.65" />
            <polygon points="250,140 430,220 250,300 70,220" fill="none" stroke="#a855f7" strokeWidth="6" />
          </g>
          {/* Top Layer */}
          <g transform="translate(0, -10)">
            <polygon points="250,140 430,220 250,300 70,220" fill="url(#orangeGrad3D)" />
            <polygon points="250,140 430,220 250,300 70,220" fill="none" stroke="#ffffff" strokeWidth="5" />
            {/* Glossy top reflection */}
            <polygon points="250,150 410,220 250,285 90,220" fill="url(#glassGrad3D)" />
          </g>
        </g>
      );
      break;

    case 'leaderboard':
    case 'trophy':
    case 'award':
      // Glorious 3D gold and orange cup trophy with high depth reflections and stars
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Background star bursts */}
          <polygon points="250,30 260,80 310,90 260,100 250,150 240,100 190,90 240,80" fill="url(#goldGrad3D)" opacity="0.75" />
          <polygon points="120,110 125,130 145,135 125,140 120,160 115,140 95,135 115,130" fill="#ffffff" opacity="0.9" />
          <polygon points="380,140 385,160 405,165 385,170 380,190 375,170 355,165 375,160" fill="#ffffff" opacity="0.9" />

          {/* Trophy handles 3D */}
          <path d="M 150,180 C 70,180 80,310 160,300" fill="none" stroke="url(#goldGrad3D)" strokeWidth="32" strokeLinecap="round" />
          <path d="M 350,180 C 430,180 420,310 340,300" fill="none" stroke="url(#goldGrad3D)" strokeWidth="32" strokeLinecap="round" />

          {/* Trophy Cup Main Body */}
          <path d="M 150,150 L 350,150 C 350,290 310,340 250,340 C 190,340 150,290 150,150 Z" fill="url(#goldGrad3D)" />
          {/* Volumetric inside of the cup */}
          <ellipse cx="250" cy="150" rx="100" ry="25" fill="#ca8a04" />

          {/* Trophy stand & base */}
          <path d="M 230,340 L 270,340 L 270,410 L 230,410 Z" fill="url(#goldGrad3D)" />
          <rect x="170" y="400" width="160" height="50" rx="12" fill="url(#orangeGrad3D)" />

          {/* Outstanding check mark badge on base */}
          <circle cx="250" cy="245" r="30" fill="url(#blueGrad3D)" stroke="#ffffff" strokeWidth="4" />
          <path d="M 240,245 L 248,253 L 262,237" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
      break;

    case 'community':
    case 'users':
      // Two 3D overlapping round pill figures (blue and purple)
      iconContent = (
        <g filter="url(#softShadow3D)">
          {/* Back user (Purple) */}
          <g transform="translate(60, 20)">
            <ellipse cx="250" cy="270" rx="100" ry="110" fill="url(#purpleGrad3D)" opacity="0.75" />
            <circle cx="250" cy="140" r="65" fill="url(#purpleGrad3D)" opacity="0.9" />
          </g>
          {/* Front user (Blue) */}
          <g transform="translate(-40, 40)">
            <ellipse cx="250" cy="270" rx="100" ry="110" fill="url(#blueGrad3D)" stroke="#ffffff" strokeWidth="4" />
            <circle cx="250" cy="140" r="65" fill="url(#blueGrad3D)" stroke="#ffffff" strokeWidth="4" />
          </g>
        </g>
      );
      break;

    case 'messages':
    case 'messagesquare':
      // Shiny 3D rounded purple/violet speech bubble with typing ellipses (exactly from user image)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          <path 
            d="M 100,100 L 400,100 C 440,100 450,140 450,170 L 450,310 C 450,350 410,360 380,360 L 160,360 L 80,420 L 100,340 C 60,330 50,300 50,270 L 50,150 C 50,110 80,100 100,100 Z" 
            fill="url(#purpleGrad3D)" 
          />
          {/* Highlight top border gradient mimicking 3D reflection */}
          <path 
            d="M100,105 L400,105 C430,105 440,120 440,150" 
            fill="none" 
            stroke="url(#glassGrad3D)" 
            strokeWidth="10" 
            strokeLinecap="round" 
          />
          
          {/* 3 glossy typing spheres representing "..." */}
          <circle cx="170" cy="230" r="22" fill="#ffffff" filter="url(#glowDraft)" />
          <circle cx="250" cy="230" r="22" fill="#ffffff" filter="url(#glowDraft)" />
          <circle cx="330" cy="230" r="22" fill="#ffffff" filter="url(#glowDraft)" />
        </g>
      );
      break;

    case 'bookmarks':
    case 'bookmark':
      // Beautiful shiny 3D bookmark tag with rounded string hole (as shown in images)
      iconContent = (
        <g filter="url(#softShadow3D)">
          {/* Back depth */}
          <path d="M 120,40 L 380,40 L 380,410 L 250,310 L 120,410 Z" fill="url(#pinkGrad3D)" opacity="0.3" transform="translate(6, 6)" />
          {/* Main Bookmark */}
          <path d="M 120,40 L 380,40 L 380,410 L 250,310 L 120,410 Z" fill="url(#pinkGrad3D)" />
          {/* Highlight overlay */}
          <path d="M 130,50 L 370,50 L 370,380 L 250,290 L 130,380 Z" fill="url(#glassGrad3D)" opacity="0.3" />
          {/* Golden hang string circle */}
          <circle cx="250" cy="110" r="28" fill="#1e293b" opacity="0.4" />
          <circle cx="250" cy="110" r="16" fill="url(#goldGrad3D)" />
          {/* Top dynamic loop wire */}
          <path d="M 250,110 C 250,0 200,0 200,50" fill="none" stroke="url(#goldGrad3D)" strokeWidth="10" strokeLinecap="round" />
        </g>
      );
      break;

    case 'settings':
    case 'gear':
      // Solid beautiful 3D purple gear with detailed lighting
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Main thick gear circle */}
          <circle cx="250" cy="250" r="130" fill="url(#purpleGrad3D)" />
          {/* Gear teeth */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <path 
              key={i}
              d="M 210,105 L 290,105 L 310,160 L 190,160 Z" 
              fill="url(#purpleGrad3D)"
              transform={`rotate(${angle}, 250, 250)`}
            />
          ))}
          {/* Realistic shading cutout circle in center */}
          <circle cx="250" cy="250" r="80" fill="#090d16" />
          <circle cx="250" cy="250" r="50" fill="url(#goldGrad3D)" />
        </g>
      );
      break;

    case 'create':
    case 'pluscircle':
    case 'plus':
      // Beautiful 3D shiny sphere with a floating white plus button inside, or Rocket
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Sphere Base */}
          <circle cx="250" cy="250" r="190" fill="url(#greenGrad3D)" />
          <circle cx="250" cy="250" r="190" fill="url(#glassGrad3D)" opacity="0.4" />
          {/* Glowing Plus symbol with 3D bevel */}
          <rect x="220" y="110" width="60" height="280" rx="15" fill="#ffffff" filter="url(#glowDraft)" />
          <rect x="110" y="220" width="280" height="60" rx="15" fill="#ffffff" filter="url(#glowDraft)" />
        </g>
      );
      break;

    case 'crown':
    case 'premium':
      // Glossy gold VIP Crown with little pearls on top (exactly matching user image)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Back ambient gold glow */}
          <path d="M 60,350 L 440,350 L 410,130 L 320,240 L 250,110 L 180,240 L 90,130 Z" fill="url(#goldGrad3D)" opacity="0.15" filter="url(#glowDraft)" />
          {/* Main Crown base */}
          <path d="M 60,350 L 440,350 L 410,130 L 320,240 L 250,110 L 180,240 L 90,130 Z" fill="url(#goldGrad3D)" stroke="#ffffff" strokeWidth="4" />
          {/* Volumetric red velvet liner cushion bottom */}
          <rect x="80" y="340" width="340" height="40" rx="15" fill="url(#pinkGrad3D)" />
          {/* Embedded sparkling jewels */}
          <circle cx="130" cy="360" r="10" fill="#3b82f6" />
          <circle cx="250" cy="360" r="10" fill="#22c55e" />
          <circle cx="370" cy="360" r="10" fill="#ec4899" />
          
          {/* Round pearls on crown spikes */}
          <circle cx="90" cy="130" r="18" fill="url(#goldGrad3D)" stroke="#ffffff" strokeWidth="2" />
          <circle cx="250" cy="110" r="22" fill="url(#goldGrad3D)" stroke="#ffffff" strokeWidth="3" />
          <circle cx="410" cy="130" r="18" fill="url(#goldGrad3D)" stroke="#ffffff" strokeWidth="2" />
        </g>
      );
      break;

    case 'logout':
      // 3D Exit Signboard or elegant door with dynamic exit arrow pushing out
      iconContent = (
        <g filter="url(#softShadow3D)">
          {/* Base doorway frame */}
          <rect x="60" y="60" width="160" height="380" rx="12" fill="#1e293b" opacity="0.4" />
          <path d="M 60,440 L 220,440 L 220,80 L 160,80" fill="none" stroke="url(#pinkGrad3D)" strokeWidth="24" strokeLinecap="round" />
          {/* Dynamic glowing 3D arrow blasting to the right */}
          <g transform="translate(140, 160)">
            <rect x="0" y="60" width="220" height="60" rx="10" fill="url(#orangeGrad3D)" />
            <polygon points="180,10 290,90 180,170" fill="url(#orangeGrad3D)" />
            {/* Gloss highlight */}
            <rect x="10" y="70" width="180" height="15" rx="5" fill="#ffffff" opacity="0.3" />
          </g>
        </g>
      );
      break;

    case 'link':
      // Beautiful 3D glowing link chain as shown in prompt (violet/pink)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Left top chain piece */}
          <rect x="100" y="100" width="180" height="120" rx="60" fill="none" stroke="url(#purpleGrad3D)" strokeWidth="48" transform="rotate(-45, 190, 160)" />
          {/* Center connecting glossy bar */}
          <rect x="190" y="210" width="120" height="48" rx="24" fill="url(#glassGrad3D)" transform="rotate(-45, 250, 250)" />
          {/* Right bottom chain piece */}
          <rect x="220" y="220" width="180" height="120" rx="60" fill="none" stroke="url(#purpleGrad3D)" strokeWidth="48" transform="rotate(-45, 310, 280)" />
        </g>
      );
      break;

    case 'car':
    case 'taxi':
      // 3D orange stylized toy car modeled directly from user's image
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Main Car Cab (Top half) */}
          <rect x="130" y="140" width="240" height="160" rx="80" fill="url(#orangeGrad3D)" />
          {/* Inner glass cabin */}
          <rect x="160" y="160" width="180" height="90" rx="45" fill="url(#glassGrad3D)" />
          {/* Main Car body (Bottom chunk) */}
          <rect x="70" y="240" width="360" height="150" rx="45" fill="url(#orangeGrad3D)" />
          
          {/* Wheels (3D styled cylinders) */}
          <circle cx="140" cy="390" r="50" fill="#1e293b" />
          <circle cx="140" cy="390" r="22" fill="#cbd5e1" />
          <circle cx="360" cy="390" r="50" fill="#1e293b" />
          <circle cx="360" cy="390" r="22" fill="#cbd5e1" />

          {/* Yellow lights */}
          <circle cx="95" cy="310" r="20" fill="url(#goldGrad3D)" />
          <circle cx="405" cy="310" r="20" fill="url(#goldGrad3D)" />
        </g>
      );
      break;

    case 'bell':
    case 'mutebell':
    case 'bell-off':
      // 3D Golden mute bell with a sleek diagnostic slash, or active alarm bell
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          <path d="M 250,70 C 180,70 140,160 140,240 L 145,340 L 355,340 L 360,240 C 360,160 320,70 250,70 Z" fill="url(#goldGrad3D)" />
          {/* Bottom rim edge */}
          <rect x="110" y="325" width="280" height="35" rx="10" fill="url(#goldGrad3D)" />
          {/* Clapper active bottom ball */}
          <circle cx="250" cy="390" r="32" fill="url(#orangeGrad3D)" />
          
          {normName.includes('mute') || normName.includes('off') ? (
            /* Premium bold red/orange 3D slash crossing out the bell precisely from user sample */
            <g transform="rotate(-45, 250, 250)" filter="url(#glowDraft)">
              <rect x="40" y="225" width="420" height="42" rx="21" fill="#ef4444" stroke="#ffffff" strokeWidth="6" />
            </g>
          ) : null}
        </g>
      );
      break;

    case 'support':
    case 'customer-service':
      // Support head with orange scalp, yellow face, and blue headset as shown in user illustration
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Face */}
          <circle cx="250" cy="260" r="130" fill="url(#goldGrad3D)" />
          {/* Hair / cap (orange scalp back) */}
          <path d="M 120,260 C 120,130 380,130 380,260 Z" fill="url(#orangeGrad3D)" />
          {/* Blue headset headband */}
          <path d="M 110,260 C 110,110 390,110 390,260" fill="none" stroke="url(#blueGrad3D)" strokeWidth="32" strokeLinecap="round" />
          {/* Big glossy earcups */}
          <rect x="80" y="200" width="55" height="120" rx="25" fill="url(#blueGrad3D)" />
          <rect x="365" y="200" width="55" height="120" rx="25" fill="url(#blueGrad3D)" />
          {/* Glossy microphone boom */}
          <path d="M 110,290 L 190,340" fill="none" stroke="url(#blueGrad3D)" strokeWidth="12" strokeLinecap="round" />
          <circle cx="190" cy="340" r="14" fill="url(#blueGrad3D)" />
        </g>
      );
      break;

    case 'info':
    case 'information':
      // 3D Glossy Dialogue Bubble (orange/yellow) with a thick human-letter "i" (exactly as from user)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Circular/oval dialogue body */}
          <path d="M 100,240 C 100,140 160,105 250,105 C 340,105 400,140 400,240 C 400,340 340,375 250,375 L 140,410 L 160,345 C 120,325 100,290 100,240 Z" fill="url(#orangeGrad3D)" />
          {/* Shine layer */}
          <path d="M 120,240 C 120,150 170,120 250,120" fill="none" stroke="url(#glassGrad3D)" strokeWidth="12" strokeLinecap="round" />
          
          {/* The white letter "i" with bevel */}
          <circle cx="250" cy="185" r="22" fill="#ffffff" filter="url(#glowDraft)" />
          <rect x="228" y="225" width="44" height="100" rx="10" fill="#ffffff" filter="url(#glowDraft)" />
        </g>
      );
      break;

    case 'gift':
    case 'giftbox':
      // 3D Gift Box (yellow box with red ribbons)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Main Gold Box */}
          <rect x="100" y="160" width="300" height="260" rx="15" fill="url(#goldGrad3D)" />
          {/* Lift Lid Cover */}
          <rect x="80" y="120" width="340" height="60" rx="12" fill="url(#goldGrad3D)" stroke="#ffffff" strokeWidth="2" />
          
          {/* Crossing Red Ribbons 3D */}
          <rect x="220" y="120" width="60" height="300" fill="url(#pinkGrad3D)" />
          <rect x="100" y="260" width="300" height="60" fill="url(#pinkGrad3D)" />
          
          {/* Ribbon Glossy knot on top */}
          <path d="M 250,120 C 210,50 130,50 180,120 Z" fill="url(#pinkGrad3D)" stroke="#ffffff" strokeWidth="2" />
          <path d="M 250,120 C 290,50 370,50 320,120 Z" fill="url(#pinkGrad3D)" stroke="#ffffff" strokeWidth="2" />
          <circle cx="250" cy="120" r="18" fill="url(#pinkGrad3D)" />
        </g>
      );
      break;

    case 'shield':
    case 'security':
      // Beautiful shiny safety shield with gradients (sea green / blue with white/metal outer border)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Back Shield */}
          <path d="M 100,100 C 200,90 250,50 250,50 C 250,50 300,90 400,100 C 400,100 420,280 250,420 C 80,280 100,100 100,100 Z" fill="url(#blueGrad3D)" stroke="#ffffff" strokeWidth="16" strokeLinejoin="round" />
          
          {/* Inside Shield Layer (Muted Teal-Green Gradient) */}
          <path d="M 125,120 C 210,110 250,80 250,80 C 250,80 290,110 375,120 C 375,120 390,265 250,380 C 110,265 125,120 125,120 Z" fill="url(#greenGrad3D)" />
          
          {/* Centered tick representing verified safety badge */}
          <path d="M 195,230 L 235,270 L 315,190" fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" filter="url(#glowDraft)" />
        </g>
      );
      break;

    case 'rocket':
      // 3D Blue cyber rocket blasting off with yellow trail fire (as shown in standard illustrations)
      iconContent = (
        <g filter="url(#intenseShadow3D)" transform="rotate(45, 250, 250)">
          {/* Orange Blast Fire Tail */}
          <path d="M 210,380 L 290,380 L 250,490 Z" fill="url(#orangeGrad3D)" />
          <path d="M 230,380 L 270,380 L 250,440 Z" fill="url(#goldGrad3D)" />
          
          {/* Left Wing */}
          <path d="M 150,350 L 190,250 L 195,380 Z" fill="url(#pinkGrad3D)" />
          {/* Right Wing */}
          <path d="M 350,350 L 310,250 L 305,380 Z" fill="url(#pinkGrad3D)" />

          {/* Rocket Fuselage Body */}
          <path d="M 195,150 C 195,50 250,20 250,20 C 250,20 305,50 305,150 L 305,370 L 195,370 Z" fill="url(#blueGrad3D)" />
          
          {/* Cockpit Glass Window (3D sphere window) */}
          <circle cx="250" cy="180" r="32" fill="url(#glassGrad3D)" stroke="#ffffff" strokeWidth="4" />
          
          {/* Fire thrust rings */}
          <rect x="210" y="365" width="80" height="20" rx="5" fill="#e2e8f0" />
        </g>
      );
      break;

    case 'target':
      // Beautiful 3D Target board with nested rings and cyan dart arrow pierced through
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Outer board base ring */}
          <circle cx="250" cy="250" r="200" fill="url(#orangeGrad3D)" />
          <circle cx="250" cy="250" r="160" fill="#ffffff" />
          <circle cx="250" cy="250" r="115" fill="url(#orangeGrad3D)" />
          <circle cx="250" cy="250" r="70" fill="#ffffff" />
          <circle cx="250" cy="250" r="30" fill="url(#orangeGrad3D)" />

          {/* 3D Cyan Dart Piercing at an Angle */}
          <g transform="translate(190, 160) rotate(-45)">
            {/* Dart tail fins */}
            <path d="M 0,0 L -25,-65 L 0,-45 L 25,-65 Z" fill="url(#pinkGrad3D)" />
            {/* Dart metal pole */}
            <rect x="-8" y="-45" width="16" height="150" fill="#cbd5e1" />
            {/* Cyan Flight Tip Body */}
            <circle cx="0" cy="115" r="15" fill="url(#blueGrad3D)" />
          </g>
        </g>
      );
      break;

    case 'instagram':
      // Styled 3D Instagram logo modeled from the multi-gradient sunset asset in illustration
      iconContent = (
        <g filter="url(#softShadow3D)">
          {/* Rounded base plate */}
          <rect x="60" y="60" width="380" height="380" rx="100" fill="url(#instaGrad3D)" />
          {/* Highlight outer rim edge */}
          <rect x="100" y="100" width="300" height="380" rx="100" fill="none" />
          
          {/* White camera lens icon body (very thick 3D lines) */}
          <rect x="120" y="120" width="260" height="260" rx="72" fill="none" stroke="#ffffff" strokeWidth="32" filter="url(#glowDraft)" />
          <circle cx="250" cy="250" r="60" fill="none" stroke="#ffffff" strokeWidth="32" filter="url(#glowDraft)" />
          <circle cx="320" cy="180" r="20" fill="#ffffff" filter="url(#glowDraft)" />
        </g>
      );
      break;

    case 'cloud':
      // Volumetric 3D glowing Cloud with soft stellar sparks (as shown in images)
      iconContent = (
        <g filter="url(#softShadow3D)">
          <path d="M 180,360 C 130,360 90,320 90,270 C 90,225 125,185 170,180 C 190,120 250,80 310,80 C 375,80 425,130 430,195 C 470,205 500,240 500,285 C 500,335 460,375 410,375 Z" fill="url(#blueGrad3D)" opacity="0.30" transform="translate(6, 6)" />
          <path d="M 180,360 C 130,360 90,320 90,270 C 90,225 125,185 170,180 C 190,120 250,80 310,80 C 375,80 425,130 430,195 C 470,205 500,240 500,285 C 500,335 460,375 410,375 Z" fill="url(#blueGrad3D)" stroke="#ffffff" strokeWidth="3" />
          <path d="M 180,350 C 140,350 110,310 110,270" fill="none" stroke="url(#glassGrad3D)" strokeWidth="12" strokeLinecap="round" />
          
          {/* Floating tiny sparks */}
          <polygon points="120,130 123,140 133,143 123,146 120,156 117,146 107,143 117,140" fill="url(#goldGrad3D)" />
          <polygon points="390,290 392,298 402,300 392,302 390,310 388,302 378,300 388,298" fill="url(#goldGrad3D)" />
        </g>
      );
      break;

    case 'image':
    case 'photo':
      // Scenic 3D photo frame with green mountains and yellow sun icon (as shown in images)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Outer rectangular board */}
          <rect x="60" y="80" width="380" height="340" rx="40" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="8" />
          {/* Inner clip bounding box */}
          <rect x="80" y="100" width="340" height="300" rx="20" fill="url(#blueGrad3D)" />
          
          {/* Volumetric Glowing Yellow Sun */}
          <circle cx="160" cy="180" r="50" fill="url(#goldGrad3D)" filter="url(#glowDraft)" />

          {/* Green Scenic Mountains (overlapping 3D) */}
          <polygon points="260,190 420,380 180,380" fill="url(#greenGrad3D)" opacity="0.9" />
          <polygon points="140,240 280,380 40,380" fill="url(#greenGrad3D)" opacity="0.8" />
        </g>
      );
      break;

    case 'calendar':
      // Beautiful 3D Calendar Grid with Purple/Blue Clock hovering over it
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          {/* Calendar main board base */}
          <rect x="70" y="120" width="360" height="310" rx="30" fill="#0f172a" stroke="#cbd5e1" strokeWidth="6" />
          {/* Red header top block */}
          <path d="M 73,123 L 427,123 C 427,123 427,190 427,190 L 73,190 Z" fill="url(#pinkGrad3D)" />
          {/* Little calendar binder rings */}
          <rect x="130" y="80" width="22" height="70" rx="11" fill="url(#glassGrad3D)" stroke="#cbd5e1" strokeWidth="4" />
          <rect x="350" y="80" width="22" height="70" rx="11" fill="url(#glassGrad3D)" stroke="#cbd5e1" strokeWidth="4" />

          {/* White sheet grids */}
          <g transform="translate(100, 220)">
            <rect x="0" y="0" width="45" height="45" rx="10" fill="#ffffff" opacity="0.3" />
            <rect x="80" y="0" width="45" height="45" rx="10" fill="#ffffff" opacity="0.3" />
            <rect x="160" y="0" width="45" height="45" rx="10" fill="#ffffff" opacity="0.3" />
            <rect x="240" y="0" width="45" height="45" rx="10" fill="url(#orangeGrad3D)" />
            
            <rect x="0" y="80" width="45" height="45" rx="10" fill="#ffffff" opacity="0.3" />
            <rect x="80" y="80" width="45" height="45" rx="10" fill="#ffffff" opacity="0.3" />
            <rect x="160" y="80" width="45" height="45" rx="10" fill="#ffffff" opacity="0.3" />
            <rect x="240" y="80" width="45" height="45" rx="10" fill="#ffffff" opacity="0.3" />
          </g>

          {/* Floating glowing Clock badge over bottom right corner */}
          <g transform="translate(290, 290)" filter="url(#intenseShadow3D)">
            <circle cx="80" cy="80" r="70" fill="url(#blueGrad3D)" stroke="#ffffff" strokeWidth="6" />
            {/* Clock hands */}
            <line x1="80" y1="80" x2="80" y2="40" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
            <line x1="80" y1="80" x2="115" y2="100" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
            <circle cx="80" cy="80" r="10" fill="url(#goldGrad3D)" />
          </g>
        </g>
      );
      break;

    case 'printer':
      // 3D printed document machine
      iconContent = (
        <g filter="url(#softShadow3D)">
          <rect x="80" y="160" width="340" height="180" rx="30" fill="url(#purpleGrad3D)" />
          {/* Feed Slot base */}
          <rect x="110" y="100" width="280" height="90" rx="15" fill="#334155" />
          {/* Output paper sliding out */}
          <path d="M 140,290 L 360,290 L 360,440 L 140,440 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="4" />
          <line x1="170" y1="340" x2="330" y2="340" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
          <line x1="170" y1="380" x2="310" y2="380" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
          {/* Glowing Green feed state dot */}
          <circle cx="360" cy="220" r="10" fill="#22c55e" filter="url(#glowDraft)" />
        </g>
      );
      break;

    case 'thumbs-up':
    case 'like':
      // 3D hand thumbs up in styled blue circular plate/badge representation
      iconContent = (
        <g filter="url(#softShadow3D)">
          <circle cx="250" cy="250" r="200" fill="url(#blueGrad3D)" opacity="0.25" />
          {/* Hand Thumbs Up silhouette styled volumetric */}
          <path 
            d="M 130,280 C 130,240 170,240 180,240 L 180,210 C 180,140 230,110 250,110 C 270,110 260,180 270,200 L 350,200 C 380,200 390,230 380,250 L 360,310 C 350,340 320,380 280,380 L 180,380 Z" 
            fill="url(#blueGrad3D)" 
            stroke="#ffffff" 
            strokeWidth="8" 
          />
          {/* Volumetric fingers segments */}
          <line x1="210" y1="250" x2="350" y2="250" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
          <line x1="210" y1="290" x2="340" y2="290" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
          <line x1="210" y1="330" x2="320" y2="330" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
        </g>
      );
      break;

    case 'thumbs-down':
    case 'dislike':
      // Inverse 3D thumbs down
      iconContent = (
        <g filter="url(#softShadow3D)" transform="scale(1, -1) translate(0, -500)">
          <circle cx="250" cy="250" r="200" fill="url(#pinkGrad3D)" opacity="0.25" />
          <path 
            d="M 130,280 C 130,240 170,240 180,240 L 180,210 C 180,140 230,110 250,110 C 270,110 260,180 270,200 L 350,200 C 380,200 390,230 380,250 L 360,310 C 350,340 320,380 280,380 L 180,380 Z" 
            fill="url(#pinkGrad3D)" 
            stroke="#ffffff" 
            strokeWidth="8" 
          />
        </g>
      );
      break;

    default:
      // Fallback elegant 3D star sparkle (as shown in photos)
      iconContent = (
        <g filter="url(#intenseShadow3D)">
          <path 
            d="M 250,50 C 250,150 350,250 450,250 C 350,250 250,350 250,450 C 250,350 150,250 50,250 C 150,250 250,150 250,50 Z" 
            fill="url(#goldGrad3D)" 
          />
          {/* Inner sparkling gloss core */}
          <path 
            d="M 250,120 C 250,200 320,250 400,250 C 320,250 250,300 250,380 C 250,300 180,250 100,250 C 180,250 250,200 250,120 Z" 
            fill="url(#glassGrad3D)" 
          />
        </g>
      );
      break;
  }

  // Calculate pixel bounds or use full width style
  const defaultSize = size || "100%";

  return (
    <svg 
      className={className} 
      viewBox="0 0 500 500" 
      width={defaultSize} 
      height={defaultSize}
      xmlns="http://www.w3.org/2000/svg"
    >
      {defs}
      {iconContent}
    </svg>
  );
}
