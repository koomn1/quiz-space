import React, { useEffect, useRef, useState } from 'react';

export interface BackgroundSettings {
  speed: number;         // 0.1 - 2.0
  brightness: number;    // 10 - 150 (percentage)
  glow: number;          // 0.1 - 2.0
  density: number;       // 0.2 - 3.0
  waveHeight: number;    // 0.2 - 2.5
  theme: 'default' | 'warm' | 'cool' | 'neon';
  blur: number;          // 0 - 40
}

interface PremiumBackgroundProps {
  mode: string; // e.g. 'cosmic' | 'aurora' | 'neon-orbit' | 'ocean-flow' | 'solar-flare' | 'galaxy' | 'liquid-glass' | 'mesh-gradient' | 'abstract-lines' | 'particles'
  settings?: Partial<BackgroundSettings>;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_SETTINGS: BackgroundSettings = {
  speed: 1.0,
  brightness: 100,
  glow: 1.0,
  density: 1.0,
  waveHeight: 1.0,
  theme: 'default',
  blur: 10,
};

export function PremiumBackground({
  mode = 'cosmic',
  settings = {},
  className = '',
  style = {}
}: PremiumBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [isTabActive, setIsTabActive] = useState(true);

  // Merge custom settings with defaults
  const activeSettings = { ...DEFAULT_SETTINGS, ...settings };
  const { speed, brightness, glow, density, waveHeight, theme, blur } = activeSettings;

  useEffect(() => {
    // Tab visibility handling
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Update mouse position with smooth easing/interpolation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = containerRef.current?.clientWidth || canvas.offsetWidth || 800;
    let height = canvas.height = containerRef.current?.clientHeight || canvas.offsetHeight || 300;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        const newW = rect.width || containerRef.current?.clientWidth || 800;
        const newH = rect.height || containerRef.current?.clientHeight || 300;
        width = canvas.width = newW;
        height = canvas.height = newH;
        initParticles();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Dynamic scale to adjust quality for mobile/desktop
    const isMobile = width < 640;
    const qualityMultiplier = isMobile ? 0.6 : 1.0;

    // --- Background Specific Data Initialization ---
    let frameCount = 0;
    const particlesArray: any[] = [];
    const particleCount = Math.floor(60 * density * qualityMultiplier);

    // Color mapper based on the selected settings theme
    const getThemeColors = (bgMode: string) => {
      if (theme === 'warm') {
        return ['#f97316', '#ef4444', '#f59e0b', '#ec4899'];
      }
      if (theme === 'cool') {
        return ['#06b6d4', '#3b82f6', '#10b981', '#6366f1'];
      }
      if (theme === 'neon') {
        return ['#ec4899', '#a855f7', '#3b82f6', '#06b6d4'];
      }
      
      // Default colors per mode
      switch (bgMode) {
        case 'cosmic':
        case 'nebula':
          return ['#7C3AED', '#8B5CF6', '#C084FC', '#3b82f6'];
        case 'aurora':
          return ['#10b981', '#14b8a6', '#06b6d4', '#6366f1'];
        case 'ocean-flow':
          return ['#1d4ed8', '#1e40af', '#0284c7', '#38bdf8'];
        case 'solar-flare':
          return ['#f97316', '#ef4444', '#f59e0b', '#dc2626'];
        case 'galaxy':
          return ['#ffffff', '#cbd5e1', '#a78bfa', '#f472b6'];
        case 'liquid-glass':
          return ['#f43f5e', '#3b82f6', '#ec4899', '#6366f1'];
        case 'mesh-gradient':
          return ['#a855f7', '#ec4899', '#3b82f6', '#10b981'];
        case 'abstract-lines':
          return ['#7c3aed', '#ec4899', '#10b981', '#3b82f6'];
        case 'particles':
        default:
          return ['#7c3aed', '#6366f1', '#a78bfa', '#3b82f6'];
      }
    };

    const colors = getThemeColors(mode);

    // Initialize particles for Galaxy, Cosmic Wave, and Particles modes
    const initParticles = () => {
      particlesArray.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particlesArray.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.5 * speed,
          speedY: (Math.random() - 0.5) * 0.5 * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.7 + 0.3,
          angle: Math.random() * Math.PI * 2,
          angularSpeed: (Math.random() - 0.5) * 0.02 * speed,
          orbitRadius: Math.random() * (width / 2) + 50,
          originalX: Math.random() * width,
          originalY: Math.random() * height,
        });
      }
    };

    initParticles();

    // Shooting stars for Galaxy and Cosmic modes
    const shootingStars: any[] = [];
    const maxShootingStars = 3;

    // Glass blobs for Liquid Glass mode
    const glassBlobs: any[] = [];
    const glassBlobCount = 5;
    for (let i = 0; i < glassBlobCount; i++) {
      glassBlobs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * (width / 4) + (width / 6),
        vx: (Math.random() - 0.5) * 1.5 * speed,
        vy: (Math.random() - 0.5) * 1.5 * speed,
        color: colors[i % colors.length],
        alpha: 0.15 + Math.random() * 0.15
      });
    }

    // Gradient Mesh Blobs
    const meshBlobs: any[] = [];
    const meshBlobCount = 4;
    for (let i = 0; i < meshBlobCount; i++) {
      meshBlobs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 200 + 200,
        vx: (Math.random() - 0.5) * 0.8 * speed,
        vy: (Math.random() - 0.5) * 0.8 * speed,
        color: colors[i % colors.length]
      });
    }

    // --- ANIMATION LOOP ---
    const draw = () => {
      if (!isTabActive) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.save();
      
      // Calculate brightness filter
      const bStrength = brightness / 100;
      ctx.globalAlpha = bStrength;

      // Dynamic mouse cursor easing
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      frameCount += 0.01 * speed;

      // Clear with correct mode background
      const drawBackgroundBase = () => {
        if (mode === 'cosmic' || mode === 'galaxy' || mode === 'nebula' || mode === 'neon-orbit' || mode === 'abstract-lines') {
          // Deep cosmos dark
          ctx.fillStyle = '#090b14';
          ctx.fillRect(0, 0, width, height);
          
          // Subtle radial dark gradient overlay
          const grad = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, width);
          grad.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
          grad.addColorStop(1, '#05070c');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        } else if (mode === 'aurora') {
          ctx.fillStyle = '#030712';
          ctx.fillRect(0, 0, width, height);
        } else if (mode === 'ocean-flow') {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, width, height);
        } else if (mode === 'solar-flare') {
          ctx.fillStyle = '#0c0401';
          ctx.fillRect(0, 0, width, height);
        } else {
          // Default dark theme
          ctx.fillStyle = '#0b0f19';
          ctx.fillRect(0, 0, width, height);
        }
      };

      drawBackgroundBase();

      // Implement specific backgrounds
      switch (mode) {
        case 'cosmic':
        case 'cosmic-wave': {
          // 1. Cosmic Wave: Dark space, flowing neon wave mesh, purple energy lines, glowing particles
          // Draw subtle background glowing orbs first
          ctx.globalCompositeOperation = 'screen';
          const glowGrad = ctx.createRadialGradient(width * 0.3 + Math.sin(frameCount * 0.2) * 100, height * 0.5, 0, width * 0.3, height * 0.5, 300);
          glowGrad.addColorStop(0, `rgba(124, 58, 237, ${0.12 * glow})`);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(0, 0, width, height);

          // Draw neon wave mesh with bezier curves or connected lines
          ctx.strokeStyle = colors[0];
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.6 * glow;

          // Parallax calculation
          const pX = (mouse.x - width / 2) * 0.03;
          const pY = (mouse.y - height / 2) * 0.03;

          // Mesh horizontal waves
          const waveCount = 3;
          for (let w = 0; w < waveCount; w++) {
            ctx.beginPath();
            const offset = w * Math.PI * 0.4;
            ctx.strokeStyle = colors[w % colors.length];
            ctx.lineWidth = 1.5 - w * 0.3;

            for (let x = 0; x <= width; x += 30) {
              const sineVal = Math.sin((x * 0.005) + frameCount * 1.5 + offset);
              const cosineVal = Math.cos((x * 0.008) - frameCount * 0.8 + offset);
              const y = (height * 0.6) + (sineVal * 30 * waveHeight) + (cosineVal * 15 * waveHeight) + pY + (w * 15);

              if (x === 0) {
                ctx.moveTo(x + pX, y);
              } else {
                ctx.lineTo(x + pX, y);
              }
              
              // Draw small grid connecting lines downwards
              if (w === 0 && x % 60 === 0) {
                ctx.save();
                ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 * glow})`;
                ctx.beginPath();
                ctx.moveTo(x + pX, y);
                ctx.lineTo(x + pX + Math.sin(frameCount + x) * 10, y + 40);
                ctx.stroke();
                ctx.restore();
              }
            }
            ctx.stroke();
          }

          // Render glowing particles floating around
          ctx.globalCompositeOperation = 'screen';
          particlesArray.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0 || p.x > width) p.speedX *= -1;
            if (p.y < 0 || p.y > height) p.speedY *= -1;

            ctx.beginPath();
            ctx.arc(p.x + pX * 0.5, p.y + pY * 0.5, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity * bStrength;
            ctx.fill();
          });
          break;
        }

        case 'aurora': {
          // 2. Aurora: northern lights soft ribbons, floating stars, Slow elegant movement
          ctx.globalCompositeOperation = 'screen';
          
          // Draw aurora ribbons using overlapping semi-transparent colored polygons / beziers
          const ribbons = 3;
          const pX = (mouse.x - width / 2) * 0.01;
          const pY = (mouse.y - height / 2) * 0.01;

          for (let r = 0; r < ribbons; r++) {
            ctx.beginPath();
            const phase = frameCount * 0.5 + r * 1.5;
            const rColor = colors[r % colors.length];

            // Create linear gradient for the ribbon
            const ribbonGrad = ctx.createLinearGradient(0, 0, 0, height);
            ribbonGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            ribbonGrad.addColorStop(0.3, `${rColor}33`); // 20% opacity
            ribbonGrad.addColorStop(0.6, `${colors[(r+1) % colors.length]}1f`); // 12% opacity
            ribbonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = ribbonGrad;

            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 20) {
              const sine = Math.sin((x * 0.003) + phase) * 45 * waveHeight;
              const cosine = Math.cos((x * 0.0015) - phase * 0.8) * 20 * waveHeight;
              const y = (height * 0.3) + sine + cosine + pY + (r * 25);
              ctx.lineTo(x + pX, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
          }

          // Soft stars
          ctx.globalCompositeOperation = 'source-over';
          particlesArray.forEach(p => {
            const starPulse = Math.sin(frameCount * 2 + p.angle) * 0.4 + 0.6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = p.opacity * starPulse * bStrength;
            ctx.fill();
          });
          break;
        }

        case 'neon-orbit': {
          // 3. Neon Orbit: Concentric glowing rotating rings, soft pulsing, small particles
          ctx.globalCompositeOperation = 'screen';
          const centerX = width / 2;
          const centerY = height / 2;
          const pX = (mouse.x - centerX) * 0.02;
          const pY = (mouse.y - centerY) * 0.02;

          // Draw glowing rings
          const ringCount = 4;
          for (let r = 0; r < ringCount; r++) {
            const baseRadius = (50 + r * 45) * waveHeight;
            const pulse = Math.sin(frameCount * 1.2 + r) * 3;
            const radius = baseRadius + pulse;

            ctx.beginPath();
            ctx.arc(centerX + pX * (r + 1), centerY + pY * (r + 1), radius, 0, Math.PI * 2);
            
            // Neon Stroke
            ctx.strokeStyle = colors[r % colors.length];
            ctx.lineWidth = 1.0 + r * 0.5;
            ctx.globalAlpha = (0.2 + (Math.sin(frameCount + r) * 0.1)) * glow;
            ctx.stroke();

            // Render minor orbit nodes
            const orbitAngle = frameCount * (0.3 / (r + 1)) + r * Math.PI * 0.5;
            const nodeX = centerX + pX * (r + 1) + Math.cos(orbitAngle) * radius;
            const nodeY = centerY + pY * (r + 1) + Math.sin(orbitAngle) * radius;

            ctx.beginPath();
            ctx.arc(nodeX, nodeY, 3, 0, Math.PI * 2);
            ctx.fillStyle = colors[(r + 1) % colors.length];
            ctx.globalAlpha = 0.8 * glow;
            ctx.fill();
          }

          // Small drifting stardust
          particlesArray.forEach(p => {
            p.x += p.speedX * 0.3;
            p.y += p.speedY * 0.3;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity * 0.4;
            ctx.fill();
          });
          break;
        }

        case 'ocean-flow': {
          // 4. Ocean Flow: Liquid movement blue gradient waves
          ctx.globalCompositeOperation = 'screen';
          const pX = (mouse.x - width / 2) * 0.02;
          const pY = (mouse.y - height / 2) * 0.02;

          const waves = 4;
          for (let i = 0; i < waves; i++) {
            ctx.beginPath();
            const phase = frameCount * 1.1 + i * 1.2;
            const waveCol = colors[i % colors.length];

            const waveGrad = ctx.createLinearGradient(0, height, 0, 0);
            waveGrad.addColorStop(0, 'rgba(2, 6, 23, 0)');
            waveGrad.addColorStop(0.5, `${waveCol}15`);
            waveGrad.addColorStop(0.8, `${colors[(i+1)%colors.length]}2b`);
            waveGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');

            ctx.fillStyle = waveGrad;

            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 15) {
              const sine = Math.sin((x * 0.004) + phase) * 35 * waveHeight;
              const cosine = Math.cos((x * 0.002) - phase * 0.7) * 15 * waveHeight;
              const y = (height * 0.5) + sine + cosine + pY + (i * 20);
              ctx.lineTo(x + pX, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
          }
          break;
        }

        case 'solar-flare': {
          // 5. Solar Flare: Orange energetic flowing ribbons, fire-like gradients, soft floating particles
          ctx.globalCompositeOperation = 'screen';
          const pX = (mouse.x - width / 2) * 0.025;
          const pY = (mouse.y - height / 2) * 0.025;

          // Flowing flames/ribbons
          const ribbons = 3;
          for (let i = 0; i < ribbons; i++) {
            ctx.beginPath();
            const phase = frameCount * 1.6 + i * 2.0;
            const color = colors[i % colors.length];

            const ribbonGrad = ctx.createLinearGradient(0, height, 0, 0);
            ribbonGrad.addColorStop(0, 'rgba(12, 4, 1, 0)');
            ribbonGrad.addColorStop(0.4, `${color}25`);
            ribbonGrad.addColorStop(0.7, `${colors[(i+1)%colors.length]}1a`);
            ribbonGrad.addColorStop(1, 'rgba(12, 4, 1, 0)');

            ctx.fillStyle = ribbonGrad;
            ctx.moveTo(0, height);

            for (let x = 0; x <= width; x += 25) {
              const sine = Math.sin((x * 0.005) + phase) * 40 * waveHeight;
              const cosine = Math.cos((x * 0.003) - phase * 0.9) * 20 * waveHeight;
              const y = (height * 0.45) + sine + cosine + pY + (i * 15);
              ctx.lineTo(x + pX, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
          }

          // Rise fire particles up
          particlesArray.forEach(p => {
            p.y -= Math.abs(p.speedY) * 1.5;
            p.x += Math.sin(frameCount + p.y * 0.02) * 0.3;
            if (p.y < -10) {
              p.y = height + 10;
              p.x = Math.random() * width;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity * 0.6 * glow;
            ctx.fill();
          });
          break;
        }

        case 'galaxy':
        case 'nebula': {
          // 6. Galaxy: Nebulas, moving stars, shooting stars, cosmic fog
          ctx.globalCompositeOperation = 'screen';
          
          // Render 2 large rotating nebula clouds
          const centerX = width / 2;
          const centerY = height / 2;
          const pX = (mouse.x - centerX) * 0.035;
          const pY = (mouse.y - centerY) * 0.035;

          // Nebula 1 (Amethyst)
          const nebGrad1 = ctx.createRadialGradient(width * 0.35 + pX, height * 0.4 + pY, 0, width * 0.35 + pX, height * 0.4 + pY, width * 0.4);
          nebGrad1.addColorStop(0, `${colors[0]}1e`); // Purple
          nebGrad1.addColorStop(0.5, `${colors[1]}0a`);
          nebGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = nebGrad1;
          ctx.fillRect(0, 0, width, height);

          // Nebula 2 (Pink/Indigo)
          const nebGrad2 = ctx.createRadialGradient(width * 0.7 + pX, height * 0.6 + pY, 0, width * 0.7 + pX, height * 0.6 + pY, width * 0.35);
          nebGrad2.addColorStop(0, `${colors[2]}18`); // pink/blue
          nebGrad2.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = nebGrad2;
          ctx.fillRect(0, 0, width, height);

          // Render Galaxy Starfield
          ctx.globalCompositeOperation = 'source-over';
          particlesArray.forEach(p => {
            const starPulse = Math.sin(frameCount * 1.5 + p.angle) * 0.4 + 0.6;
            ctx.beginPath();
            ctx.arc(p.x + pX * 0.5, p.y + pY * 0.5, p.size * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = p.opacity * starPulse;
            ctx.fill();
          });

          // Handle Random Shooting Stars
          if (Math.random() < 0.015 && shootingStars.length < maxShootingStars) {
            shootingStars.push({
              x: Math.random() * width,
              y: Math.random() * (height * 0.6),
              length: Math.random() * 80 + 40,
              speed: Math.random() * 8 + 6,
              angle: Math.PI / 4 + (Math.random() - 0.5) * 0.1,
              opacity: 1.0
            });
          }

          shootingStars.forEach((star, index) => {
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;
            star.opacity -= 0.025;

            if (star.opacity <= 0 || star.x > width || star.y > height) {
              shootingStars.splice(index, 1);
            } else {
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              ctx.strokeStyle = `rgba(224, 242, 254, ${star.opacity})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(star.x, star.y);
              ctx.lineTo(star.x - Math.cos(star.angle) * star.length, star.y - Math.sin(star.angle) * star.length);
              ctx.stroke();
              ctx.restore();
            }
          });
          break;
        }

        case 'liquid-glass': {
          // 7. Liquid Glass: Glass reflections, refraction, blur layers, floating highlights
          ctx.globalCompositeOperation = 'screen';
          
          // Animate glass blobs
          glassBlobs.forEach(blob => {
            // Blob physics
            blob.x += blob.vx;
            blob.y += blob.vy;

            // Soft wall bounce
            if (blob.x - blob.radius < 0 || blob.x + blob.radius > width) blob.vx *= -1;
            if (blob.y - blob.radius < 0 || blob.y + blob.radius > height) blob.vy *= -1;

            // Cursor attraction/repulsion subtly
            const dx = mouse.x - blob.x;
            const dy = mouse.y - blob.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 250) {
              // Subtle attraction to mouse
              blob.vx += (dx / dist) * 0.02 * speed;
              blob.vy += (dy / dist) * 0.02 * speed;
            }

            // Cap velocity
            const maxV = 2.0 * speed;
            const currentSpeed = Math.sqrt(blob.vx*blob.vx + blob.vy*blob.vy);
            if (currentSpeed > maxV) {
              blob.vx = (blob.vx / currentSpeed) * maxV;
              blob.vy = (blob.vy / currentSpeed) * maxV;
            }

            // Draw blob as radial glow
            const blobGrad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
            blobGrad.addColorStop(0, `${blob.color}55`); // 33% opacity
            blobGrad.addColorStop(0.5, `${blob.color}22`);
            blobGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = blobGrad;
            ctx.beginPath();
            ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
            ctx.fill();
          });

          // Draw a glass reflection highlights overlay
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
          ctx.fillRect(0, 0, width, height);

          // Glass edge highlights mimicking dynamic Apple glass reflections
          const reflectionGrad = ctx.createLinearGradient(0, 0, width, height);
          reflectionGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
          reflectionGrad.addColorStop(0.5, 'rgba(255,255,255,0.0)');
          reflectionGrad.addColorStop(1, 'rgba(255,255,255,0.03)');
          ctx.fillStyle = reflectionGrad;
          ctx.fillRect(0, 0, width, height);
          break;
        }

        case 'mesh-gradient': {
          // 8. Mesh Gradient: Animated premium gradients, Dynamic color morphing, soft transitions
          ctx.globalCompositeOperation = 'screen';
          
          meshBlobs.forEach(blob => {
            blob.x += blob.vx;
            blob.y += blob.vy;

            if (blob.x < -100 || blob.x > width + 100) blob.vx *= -1;
            if (blob.y < -100 || blob.y > height + 100) blob.vy *= -1;

            // Slow circle drift
            const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
            grad.addColorStop(0, `${blob.color}45`); // 25% opacity
            grad.addColorStop(0.7, `${blob.color}11`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }

        case 'abstract-lines': {
          // 9. Abstract Lines: Premium curved animated paths, neon glow, minimal motion
          ctx.globalCompositeOperation = 'screen';
          
          const pX = (mouse.x - width / 2) * 0.015;
          const pY = (mouse.y - height / 2) * 0.015;

          const linesCount = 4;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.5 * glow;

          for (let l = 0; l < linesCount; l++) {
            ctx.strokeStyle = colors[l % colors.length];
            ctx.beginPath();

            const yOffset = height * (0.2 + l * 0.2) + pY;
            const freq = 0.003 + l * 0.001;
            const phase = frameCount * 1.2 + l * Math.PI * 0.25;

            for (let x = 0; x <= width; x += 15) {
              const sine = Math.sin((x * freq) + phase) * 30 * waveHeight;
              const cosine = Math.cos((x * 0.002) - phase * 0.6) * 10 * waveHeight;
              const yVal = yOffset + sine + cosine;

              if (x === 0) {
                ctx.moveTo(x + pX, yVal);
              } else {
                ctx.lineTo(x + pX, yVal);
              }
            }
            ctx.stroke();
          }
          break;
        }

        case 'particles':
        default: {
          // 10. Floating Particles: Mouse interaction, dynamic connections, glow, depth effect
          ctx.globalCompositeOperation = 'source-over';
          
          const pX = (mouse.x - width / 2) * 0.02;
          const pY = (mouse.y - height / 2) * 0.02;

          // Connect particles if within proximity
          const maxDistance = 90;
          for (let a = 0; a < particlesArray.length; a++) {
            const pA = particlesArray[a];
            pA.x += pA.speedX;
            pA.y += pA.speedY;

            // Bounce
            if (pA.x < 0 || pA.x > width) pA.speedX *= -1;
            if (pA.y < 0 || pA.y > height) pA.speedY *= -1;

            // Mouse interact
            const dx = mouse.x - pA.x;
            const dy = mouse.y - pA.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 120) {
              // Gravitate gently towards mouse
              pA.x += (dx / dist) * 0.3 * speed;
              pA.y += (dy / dist) * 0.3 * speed;
            }

            // Draw individual node
            ctx.beginPath();
            ctx.arc(pA.x, pA.y, pA.size, 0, Math.PI * 2);
            ctx.fillStyle = pA.color;
            ctx.globalAlpha = pA.opacity * bStrength;
            ctx.fill();

            // Check neighbors for connection lines
            for (let b = a + 1; b < particlesArray.length; b++) {
              const pB = particlesArray[b];
              const distDx = pA.x - pB.x;
              const distDy = pA.y - pB.y;
              const neighborDist = Math.sqrt(distDx * distDx + distDy * distDy);

              if (neighborDist < maxDistance) {
                ctx.beginPath();
                ctx.strokeStyle = pA.color;
                // Line opacity fades the further they are
                const lineAlpha = (1.0 - (neighborDist / maxDistance)) * 0.15 * glow;
                ctx.globalAlpha = lineAlpha;
                ctx.lineWidth = 0.5;
                ctx.moveTo(pA.x, pA.y);
                ctx.lineTo(pB.x, pB.y);
                ctx.stroke();
              }
            }
          }
          break;
        }
      }

      ctx.restore();
      requestRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [mode, speed, brightness, glow, density, waveHeight, theme, blur, isTabActive]);

  // CSS Blur Filter
  const filterStyle: React.CSSProperties = {
    filter: blur > 0 ? `blur(${blur}px)` : 'none',
    transform: blur > 0 ? 'scale(1.05)' : 'none', // scale slightly to hide blur edges
    transition: 'filter 0.3s ease-out, transform 0.3s ease-out',
    ...style
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden w-full h-full pointer-events-none select-none ${className}`}
      style={{ zIndex: 0 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block absolute inset-0"
        style={filterStyle}
      />
    </div>
  );
}
