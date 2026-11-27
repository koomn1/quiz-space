import React, { useRef, useState, useMemo, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export type CosmoAnimationState = 'idle' | 'wave' | 'celebrate' | 'guide';

export interface CosmoGuideCanvasProps {
  state?: CosmoAnimationState;
  size?: number;
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}

interface MascotMeshProps {
  state: CosmoAnimationState;
  isSpinning: boolean;
  onSpinComplete: () => void;
  onClick?: () => void;
}

// Procedural 3D Character "Cosmo"
function CosmoMesh({ state, isSpinning, onSpinComplete, onClick }: MascotMeshProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Mesh>(null);
  const rightHandRef = useRef<THREE.Mesh>(null);
  const eyesGroupRef = useRef<THREE.Group>(null);
  const antennaRef = useRef<THREE.Mesh>(null);

  const [spinRotation, setSpinRotation] = useState(0);
  const spinRef = useRef(0);
  const spinActiveRef = useRef(isSpinning);

  useEffect(() => {
    spinActiveRef.current = isSpinning;
    if (isSpinning) {
      spinRef.current = 0;
    }
  }, [isSpinning]);

  // Brand Colors
  const colors = useMemo(
    () => ({
      petrol: new THREE.Color('#007472'),
      petrolDark: new THREE.Color('#004f4e'),
      brightTeal: new THREE.Color('#2AC3BB'),
      coral: new THREE.Color('#EE8361'),
      ivory: new THREE.Color('#FCF6EE'),
      surface: new THREE.Color('#072424'),
    }),
    []
  );

  useFrame((stateContext, delta) => {
    const t = stateContext.clock.getElapsedTime();

    // 1. Root gentle levitation and breathing
    if (rootGroupRef.current) {
      // Idle hovering
      const hoverY = Math.sin(t * 2) * 0.08;
      rootGroupRef.current.position.y = hoverY;

      // Handle spin animation
      if (spinActiveRef.current) {
        spinRef.current += delta * 9;
        rootGroupRef.current.rotation.y = spinRef.current;
        if (spinRef.current >= Math.PI * 2) {
          rootGroupRef.current.rotation.y = 0;
          spinActiveRef.current = false;
          onSpinComplete();
        }
      } else {
        // Subtle posture reaction based on state
        if (state === 'guide') {
          rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(
            rootGroupRef.current.rotation.y,
            0.35,
            0.08
          );
          rootGroupRef.current.rotation.z = THREE.MathUtils.lerp(
            rootGroupRef.current.rotation.z,
            -0.05,
            0.08
          );
        } else if (state === 'celebrate') {
          rootGroupRef.current.rotation.y = Math.sin(t * 4) * 0.3;
          rootGroupRef.current.position.y = hoverY + Math.abs(Math.sin(t * 6)) * 0.15;
        } else if (state === 'wave') {
          rootGroupRef.current.rotation.z = Math.sin(t * 3) * 0.06;
          rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(
            rootGroupRef.current.rotation.y,
            -0.15,
            0.08
          );
        } else {
          // Idle tilt
          rootGroupRef.current.rotation.y = Math.sin(t * 0.8) * 0.1;
          rootGroupRef.current.rotation.z = Math.sin(t * 1.2) * 0.03;
        }
      }
    }

    // 2. Left Hand Animation
    if (leftHandRef.current) {
      const baseLeftX = -1.15;
      if (state === 'celebrate') {
        leftHandRef.current.position.x = baseLeftX + 0.15;
        leftHandRef.current.position.y = 0.5 + Math.sin(t * 6) * 0.1;
        leftHandRef.current.position.z = 0.2;
      } else {
        leftHandRef.current.position.x = baseLeftX;
        leftHandRef.current.position.y = -0.3 + Math.sin(t * 2 + 1) * 0.07;
        leftHandRef.current.position.z = 0.1;
      }
    }

    // 3. Right Hand Animation
    if (rightHandRef.current) {
      const baseRightX = 1.15;
      if (state === 'wave') {
        // High waving hand
        rightHandRef.current.position.x = 0.95 + Math.sin(t * 7) * 0.1;
        rightHandRef.current.position.y = 0.45 + Math.cos(t * 7) * 0.08;
        rightHandRef.current.position.z = 0.35;
      } else if (state === 'guide') {
        // Pointing/beckoning forward
        rightHandRef.current.position.x = 1.05;
        rightHandRef.current.position.y = -0.05 + Math.sin(t * 3) * 0.06;
        rightHandRef.current.position.z = 0.55 + Math.sin(t * 4) * 0.1;
      } else if (state === 'celebrate') {
        rightHandRef.current.position.x = baseRightX - 0.15;
        rightHandRef.current.position.y = 0.5 + Math.sin(t * 6 + Math.PI / 2) * 0.1;
        rightHandRef.current.position.z = 0.2;
      } else {
        // Idle gentle float
        rightHandRef.current.position.x = baseRightX;
        rightHandRef.current.position.y = -0.3 + Math.sin(t * 2 - 1) * 0.07;
        rightHandRef.current.position.z = 0.1;
      }
    }

    // 4. Eyes blinking & pulse
    if (eyesGroupRef.current) {
      // Periodic blink every 3.5s
      const blinkCycle = t % 3.5;
      const isBlinking = blinkCycle > 3.35;
      eyesGroupRef.current.scale.y = isBlinking ? 0.15 : 1;
    }

    // 5. Antenna Pulse
    if (antennaRef.current) {
      const pulse = 1 + Math.sin(t * 4) * 0.12;
      antennaRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group
      ref={rootGroupRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* --- Cosmo Helmet / Head --- */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <sphereGeometry args={[0.9, 36, 36]} />
        <meshStandardMaterial
          color={colors.petrol}
          roughness={0.28}
          metalness={0.4}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* --- Helmet Base Rim / Collar --- */}
      <mesh position={[0, -0.68, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.12, 16, 32]} />
        <meshStandardMaterial color={colors.petrolDark} roughness={0.4} metalness={0.5} />
      </mesh>

      {/* --- Visor (Glowing Bright Teal) --- */}
      <mesh position={[0, 0.04, 0.58]} scale={[0.78, 0.56, 0.38]}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial
          color={colors.brightTeal}
          emissive={colors.brightTeal}
          emissiveIntensity={0.65}
          roughness={0.15}
          metalness={0.2}
        />
      </mesh>

      {/* --- Visor Rim Accent --- */}
      <mesh position={[0, 0.04, 0.52]} rotation={[0, 0, 0]} scale={[0.82, 0.6, 0.4]}>
        <torusGeometry args={[0.88, 0.04, 16, 32]} />
        <meshStandardMaterial color={colors.petrolDark} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* --- Visor Eyes (Happy Expression) --- */}
      <group ref={eyesGroupRef} position={[0, 0.08, 0.88]}>
        {/* Left Eye */}
        <mesh position={[-0.23, 0, 0]}>
          <capsuleGeometry args={[0.045, 0.1, 8, 16]} />
          <meshBasicMaterial color="#031717" />
        </mesh>
        {/* Left Eye Sparkle */}
        <mesh position={[-0.21, 0.04, 0.04]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshBasicMaterial color={colors.ivory} />
        </mesh>

        {/* Right Eye */}
        <mesh position={[0.23, 0, 0]}>
          <capsuleGeometry args={[0.045, 0.1, 8, 16]} />
          <meshBasicMaterial color="#031717" />
        </mesh>
        {/* Right Eye Sparkle */}
        <mesh position={[0.25, 0.04, 0.04]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshBasicMaterial color={colors.ivory} />
        </mesh>

        {/* Happy Smile Arc */}
        <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.07, 0.015, 8, 16, Math.PI]} />
          <meshBasicMaterial color="#031717" />
        </mesh>
      </group>

      {/* --- Headphone / Ear Accents --- */}
      {/* Left Ear */}
      <mesh position={[-0.92, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.14, 24]} />
        <meshStandardMaterial color={colors.surface} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[-0.98, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.18, 0.03, 16, 24]} />
        <meshStandardMaterial color={colors.coral} emissive={colors.coral} emissiveIntensity={0.4} />
      </mesh>

      {/* Right Ear */}
      <mesh position={[0.92, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.14, 24]} />
        <meshStandardMaterial color={colors.surface} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0.98, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.18, 0.03, 16, 24]} />
        <meshStandardMaterial color={colors.coral} emissive={colors.coral} emissiveIntensity={0.4} />
      </mesh>

      {/* --- Top Antenna & Coral Star Badge --- */}
      {/* Stalk */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 16]} />
        <meshStandardMaterial color={colors.petrolDark} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Antenna Glowing Tip */}
      <mesh ref={antennaRef} position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial
          color={colors.coral}
          emissive={colors.coral}
          emissiveIntensity={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Chest / Collar Badge (Coral Star Accent) */}
      <mesh position={[0, -0.66, 0.65]} rotation={[0.3, 0, 0]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial
          color={colors.coral}
          emissive={colors.coral}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* --- Detached Floating Hands --- */}
      {/* Left Hand */}
      <mesh ref={leftHandRef} castShadow position={[-1.15, -0.3, 0.1]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color={colors.ivory}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Right Hand */}
      <mesh ref={rightHandRef} castShadow position={[1.15, -0.3, 0.1]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color={colors.ivory}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

// Fallback 2.5D SVG Mascot for non-WebGL environments
export function CosmoFallbackSvg({
  size = 140,
  onClick,
  className = '',
  state = 'idle',
}: {
  size?: number;
  onClick?: () => void;
  className?: string;
  state?: CosmoAnimationState;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="مرشد كويز سبيس كوزمو"
      className={`relative inline-flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-105 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
      data-testid="cosmo-mascot-fallback"
    >
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_8px_20px_rgba(0,116,114,0.35)]"
      >
        <defs>
          <radialGradient id="helmetGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#009693" />
            <stop offset="60%" stopColor="#007472" />
            <stop offset="100%" stopColor="#004f4e" />
          </radialGradient>
          <radialGradient id="visorGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#55e2db" />
            <stop offset="60%" stopColor="#2AC3BB" />
            <stop offset="100%" stopColor="#15827c" />
          </radialGradient>
          <radialGradient id="coralGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffa080" />
            <stop offset="70%" stopColor="#EE8361" />
            <stop offset="100%" stopColor="#b65233" />
          </radialGradient>
          <filter id="tealGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Floating Animation Wrapper */}
        <g className="animate-pulse">
          {/* Antenna stalk & star */}
          <line x1="80" y1="36" x2="80" y2="20" stroke="#004f4e" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="16" r="8" fill="url(#coralGrad)" filter="url(#tealGlow)" />

          {/* Ears / Side Nodes */}
          <rect x="22" y="72" width="10" height="20" rx="5" fill="#072424" />
          <rect x="20" y="77" width="5" height="10" rx="2" fill="#EE8361" />
          <rect x="128" y="72" width="10" height="20" rx="5" fill="#072424" />
          <rect x="135" y="77" width="5" height="10" rx="2" fill="#EE8361" />

          {/* Helmet Body */}
          <circle cx="80" cy="82" r="50" fill="url(#helmetGrad)" />
          {/* Helmet Collar */}
          <ellipse cx="80" cy="124" rx="34" ry="8" fill="#072424" />

          {/* Visor */}
          <ellipse cx="80" cy="82" rx="38" ry="26" fill="url(#visorGrad)" filter="url(#tealGlow)" />

          {/* Visor Smiling Eyes */}
          <ellipse cx="68" cy="80" rx="4.5" ry="7" fill="#031717" />
          <circle cx="70" cy="77" r="1.8" fill="#FCF6EE" />
          <ellipse cx="92" cy="80" rx="4.5" ry="7" fill="#031717" />
          <circle cx="94" cy="77" r="1.8" fill="#FCF6EE" />
          {/* Smile */}
          <path d="M75 92 Q80 97 85 92" stroke="#031717" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Chest Badge */}
          <polygon points="80,120 84,128 76,128" fill="url(#coralGrad)" />

          {/* Floating Hands */}
          <circle
            cx="24"
            cy="110"
            r="11"
            fill="#FCF6EE"
            className={state === 'celebrate' ? '-translate-y-6 transition-transform' : ''}
          />
          <circle
            cx="136"
            cy={state === 'wave' ? '80' : '110'}
            r="11"
            fill="#FCF6EE"
            className={state === 'wave' ? 'animate-bounce' : ''}
          />
        </g>
      </svg>
    </div>
  );
}

// React Error Boundary to catch Three.js / WebGL crashes
interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[CosmoGuideCanvas] WebGL context unavailable, falling back to 2.5D SVG:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// WebGL availability check
function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const CosmoGuideCanvas: React.FC<CosmoGuideCanvasProps> = ({
  state = 'idle',
  size = 140,
  onClick,
  className = '',
  interactive = true,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const [isSpinning, setIsSpinning] = useState(false);
  const [webglReady, setWebGLReady] = useState(false);

  useEffect(() => {
    setWebGLReady(isWebGLSupported());
  }, []);

  const handleClick = () => {
    if (!isSpinning && interactive) {
      setIsSpinning(true);
    }
    onClick?.();
  };

  const fallback = (
    <CosmoFallbackSvg
      size={size}
      onClick={handleClick}
      className={className}
      state={state}
    />
  );

  if (!webglReady) {
    return fallback;
  }

  return (
    <WebGLErrorBoundary fallback={fallback}>
      <div
        className={`relative inline-block select-none cursor-pointer group ${className}`}
        style={{ width: size, height: size }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="كوزمو، مرشد كويز سبيس التفاعلي ثلاثي الأبعاد"
        data-testid="cosmo-3d-canvas"
      >
        {/* Soft Teal Ambient Aura */}
        <div className="absolute inset-2 -z-10 rounded-full bg-[#2AC3BB]/15 blur-xl group-hover:bg-[#2AC3BB]/25 transition-all duration-500 pointer-events-none" />

        <Canvas
          frameloop={reducedMotion ? 'demand' : 'always'}
          camera={{ position: [0, 0, 4.2], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 5, 4]} intensity={1.4} color="#FCF6EE" />
          <pointLight position={[-3, -2, -1]} intensity={0.7} color="#2AC3BB" />
          <pointLight position={[0, 2, 2]} intensity={0.5} color="#EE8361" />

          <CosmoMesh
            state={state}
            isSpinning={isSpinning}
            onSpinComplete={() => setIsSpinning(false)}
            onClick={handleClick}
          />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
};

export default CosmoGuideCanvas;
