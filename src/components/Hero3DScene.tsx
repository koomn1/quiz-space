import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, Sparkles, MeshDistortMaterial, ContactShadows, PresentationControls, Instances, Instance, Text, Edges } from '@react-three/drei';
import * as THREE from 'three';

const Orb = () => {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshDistortMaterial 
          color="#A855F7" 
          envMapIntensity={1} 
          clearcoat={1} 
          clearcoatRoughness={0.1} 
          metalness={0.8} 
          roughness={0.2} 
          distort={0.4} 
          speed={3} 
        />
      </mesh>
    </Float>
  );
};

const QuizCards = () => {
  const group = useRef<THREE.Group>(null);
  const cards = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      position: [
        Math.random() * 8 - 4,
        Math.random() * 6 - 3,
        Math.random() * 4 - 2
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0
      ] as [number, number, number],
      scale: 0.5 + Math.random() * 0.5
    }));
  }, []);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, (state.mouse.x * Math.PI) / 4, 0.05);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, (state.mouse.y * Math.PI) / 4, 0.05);
    }
  });

  return (
    <group ref={group}>
      {cards.map((card, i) => (
        <Float key={i} speed={1.5} rotationIntensity={1.5} floatIntensity={2} position={card.position} rotation={card.rotation}>
          <mesh castShadow receiveShadow scale={card.scale}>
            <boxGeometry args={[2, 3, 0.1]} />
            <meshPhysicalMaterial 
              color={i % 2 === 0 ? "#7C3AED" : "#C084FC"} 
              transmission={0.9} 
              opacity={1} 
              metalness={0.2} 
              roughness={0.1} 
              ior={1.5} 
              thickness={0.5} 
            />
            <Edges scale={1} threshold={15} color="white" />
            <Text 
              position={[0, 0, 0.06]} 
              fontSize={0.5} 
              color="#ffffff"
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-Ek-_EeA.woff"
            >
              Q
            </Text>
          </mesh>
        </Float>
      ))}
    </group>
  );
};

export const Hero3DScene = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-60 mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#A855F7" />
        
        <PresentationControls 
          global 
          rotation={[0, 0.3, 0]} 
          polar={[-Math.PI / 3, Math.PI / 3]} 
          azimuth={[-Math.PI / 1.4, Math.PI / 2]}
        >
          <Orb />
          <QuizCards />
        </PresentationControls>
        
        <Sparkles count={100} scale={12} size={2} speed={0.4} color="#C084FC" opacity={0.5} />
        
        <ContactShadows position={[0, -4, 0]} opacity={0.4} scale={20} blur={2} far={4.5} color="#7C3AED" />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};
