import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles as ThreeSparkles } from '@react-three/drei';
import { X, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

// Procedural 3D Cosmo Robot Mesh in Three.js
function CosmoProceduralMesh({
  isCelebrating,
  pointerPos,
}: {
  isCelebrating: boolean;
  pointerPos: { x: number; y: number };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftThrusterRef = useRef<THREE.Group>(null);
  const rightThrusterRef = useRef<THREE.Group>(null);
  const antennaRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!groupRef.current) return;

    // Zero-g floating hover
    groupRef.current.position.y = Math.sin(t * 2.5) * 0.12;

    if (isCelebrating) {
      // Victory 360 spin & joyful hop
      groupRef.current.rotation.y += 0.15;
      groupRef.current.position.y += Math.sin(t * 8) * 0.08;
    } else {
      // Smooth look-at tracking mouse pointer
      const targetRotY = (pointerPos.x * 0.5);
      const targetRotX = (-pointerPos.y * 0.3);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.08);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.08);
    }

    // Floating satellite thrusters
    if (leftThrusterRef.current && rightThrusterRef.current) {
      leftThrusterRef.current.position.y = Math.sin(t * 3 + 1) * 0.06;
      rightThrusterRef.current.position.y = Math.sin(t * 3 + 2) * 0.06;
    }

    // Antenna pulse bob
    if (antennaRef.current) {
      antennaRef.current.rotation.z = Math.sin(t * 4) * 0.1;
    }

    // Eye blink cycle every 4 seconds
    const blinkCycle = Math.floor(t % 4);
    const isBlinking = blinkCycle === 0 && (t % 1) < 0.15;
    const eyeScaleY = isBlinking ? 0.1 : 1;
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = eyeScaleY;
      rightEyeRef.current.scale.y = eyeScaleY;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Main Robot Head Ceramic Sphere */}
      <mesh ref={headRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#FCF6EE"
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      {/* 2. Curved Visor Face Plate */}
      <mesh position={[0, 0.05, 0.65]} rotation={[-0.1, 0, 0]}>
        <sphereGeometry args={[0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        <meshStandardMaterial
          color="#031717"
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* 3. Glowing LED Visor Ring Accent */}
      <mesh position={[0, 0.05, 0.63]}>
        <torusGeometry args={[0.62, 0.035, 16, 40]} />
        <meshBasicMaterial color="#2AC3BB" />
      </mesh>

      {/* 4. Expressive Cyber Eyes */}
      <mesh ref={leftEyeRef} position={[-0.24, 0.1, 0.88]}>
        <capsuleGeometry args={[0.07, 0.12, 8, 16]} />
        <meshBasicMaterial color="#2AC3BB" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.24, 0.1, 0.88]}>
        <capsuleGeometry args={[0.07, 0.12, 8, 16]} />
        <meshBasicMaterial color="#2AC3BB" />
      </mesh>

      {/* 5. Antenna with Glowing Energy Beacon */}
      <group ref={antennaRef} position={[0, 0.98, 0]}>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.025, 0.04, 0.4, 16]} />
          <meshStandardMaterial color="#007472" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#EE8361" />
        </mesh>
      </group>

      {/* 6. Satellite Hover Hands / Thrusters */}
      <group ref={leftThrusterRef} position={[-1.28, -0.2, 0]}>
        <mesh>
          <capsuleGeometry args={[0.18, 0.35, 12, 16]} />
          <meshStandardMaterial color="#007472" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.28, 0]}>
          <coneGeometry args={[0.12, 0.22, 16]} />
          <meshBasicMaterial color="#2AC3BB" />
        </mesh>
      </group>

      <group ref={rightThrusterRef} position={[1.28, -0.2, 0]}>
        <mesh>
          <capsuleGeometry args={[0.18, 0.35, 12, 16]} />
          <meshStandardMaterial color="#007472" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.28, 0]}>
          <coneGeometry args={[0.12, 0.22, 16]} />
          <meshBasicMaterial color="#2AC3BB" />
        </mesh>
      </group>

      {/* 7. Ambient Particle Dust around Cosmo */}
      <ThreeSparkles count={18} scale={3} size={2} speed={0.4} color="#2AC3BB" />
    </group>
  );
}

interface Cosmo3DGuideProps {
  onNavigateToTarget: (targetRoom: 'chest' | 'spin' | 'matrix' | 'memory' | 'leaderboard') => void;
  targetRoom?: 'chest' | 'spin' | 'matrix' | 'memory' | 'leaderboard';
  suggestedActionTitleAr?: string;
  suggestedActionTitleEn?: string;
  isDailyClaimed?: boolean;
}

export const Cosmo3DGuide: React.FC<Cosmo3DGuideProps> = ({
  onNavigateToTarget,
  targetRoom = 'chest',
  suggestedActionTitleAr = 'افتح صندوق المفاجآت اليومي 🎁',
  suggestedActionTitleEn = 'Open Daily Mystery Chest 🎁',
  isDailyClaimed = false,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-adapt prompt based on state
  const target = isDailyClaimed ? 'matrix' : targetRoom;
  const actionText = isDailyClaimed ? 'العب مصفوفة الكلمات الذكية 🧩' : suggestedActionTitleAr;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setPointer({ x, y });
  };

  const handleActionClick = () => {
    setIsCelebrating(true);
    // GSAP celebration bounce
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1.05,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          onNavigateToTarget(target);
        },
      });
    } else {
      onNavigateToTarget(target);
    }
  };

  const handleDismiss = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => setIsVisible(false),
      });
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className="relative z-20 flex flex-col sm:flex-row items-center gap-4 rounded-3xl border border-[#2AC3BB]/40 bg-gradient-to-r from-[#031717]/95 via-[#072424]/95 to-[#007472]/80 p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all"
    >
      {/* 3D Canvas Container */}
      <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-visible cursor-grab active:cursor-grabbing">
        <Canvas
          frameloop={reducedMotion ? 'demand' : 'always'}
          camera={{ position: [0, 0, 3.2], fov: 45 }}
          className="h-full w-full"
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 4, 2]} intensity={2.2} color="#FFFFFF" />
          <pointLight position={[-2, -2, -1]} intensity={1.5} color="#2AC3BB" />
          <pointLight position={[2, -1, 1]} intensity={1.2} color="#EE8361" />
          <CosmoProceduralMesh isCelebrating={isCelebrating} pointerPos={pointer} />
        </Canvas>
        <div className="absolute -bottom-1 inset-x-0 mx-auto w-14 h-2 rounded-full bg-black/40 blur-xs" />
      </div>

      {/* Guide Speech & Action Message */}
      <div className="flex-1 text-center sm:text-start space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#2AC3BB]/20 px-2.5 py-0.5 text-xs font-black text-[#2AC3BB]">
            <span className="h-2 w-2 rounded-full bg-[#2AC3BB] animate-ping" />
            <span>كوزمو مرشد الألعاب 3D</span>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="إخفاء مؤقت"
            aria-label="Dismiss guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm font-bold leading-snug text-[#FCF6EE]">
          {isDailyClaimed
            ? 'أحسنت يا بطل! فتحت هدية اليوم، يلا نلعب مصفوفة الكلمات ونجمع نقاط أكثر؟ 🚀'
            : 'فيه حاجة جديدة النهاردة، نروح نشوفها مع بعض؟ 🎁'}
        </p>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
          <button
            onClick={handleActionClick}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2AC3BB] to-[#007472] px-4 py-2 text-xs font-black text-[#031717] shadow-lg shadow-[#2AC3BB]/25 transition hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <span>{actionText}</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
};
