import React, { useEffect, useRef, useState } from 'react';
import { ChapterId } from '../types/archive';

export interface CursorBurstSignal {
  type: 'unlock' | 'secret' | 'chapter';
  tick: number;
}

interface CustomCursorProps {
  activeChapter: ChapterId;
  reducedMotion: boolean;
  hovered3dKind?: 'artifact' | 'lost' | 'secret' | 'globe' | 'gear' | null;
  burstSignal?: CursorBurstSignal | null;
}

function getEraTint(ch: ChapterId): string {
  switch (ch) {
    case 'ch1':
    case 'ch2':
      return '#D9822B';
    case 'ch3':
    case 'ch5':
      return '#A6C7A9';
    default:
      return '#BFC7CB';
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({
  activeChapter,
  reducedMotion,
  hovered3dKind = null,
  burstSignal,
}) => {
  const [enabled, setEnabled] = useState(false);

  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const auraRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const rippleRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const eraColorRef = useRef(getEraTint(activeChapter));
  eraColorRef.current = getEraTint(activeChapter);
  const hovered3dRef = useRef(hovered3dKind);
  hovered3dRef.current = hovered3dKind;

  const particlesRef = useRef<Particle[]>([]);
  const posRef = useRef({
    targetX: -120,
    targetY: -120,
    ringX: -120,
    ringY: -120,
    dotX: -120,
    dotY: -120,
    visible: false,
    hoverKind: 'default' as 'default' | 'interactive' | 'discovery' | 'nav',
    hoverLabel: '',
    scrollVel: 0,
    rippleAge: 99,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion) {
      setEnabled(false);
      return;
    }
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const fine = window.matchMedia?.('(pointer: fine)')?.matches ?? true;
    setEnabled(!coarse && fine);
  }, [reducedMotion]);

  // Burst reaction when artifacts/secrets/chapters unlock
  useEffect(() => {
    if (!enabled || !burstSignal || burstSignal.tick === 0) return;
    const p = posRef.current;
    p.rippleAge = 0;

    if (burstSignal.type === 'secret') {
      const originX = p.ringX > 0 ? p.ringX : window.innerWidth * 0.5;
      const originY = p.ringY > 0 ? p.ringY : window.innerHeight * 0.5;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.25;
        const spd = 1.4 + Math.random() * 2.2;
        particlesRef.current.push({
          x: originX,
          y: originY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0,
          maxLife: 0.65 + Math.random() * 0.25,
          color: i % 2 === 0 ? '#D9822B' : '#F6B26B',
          size: 2.2 + Math.random() * 1.4,
        });
      }
    } else if (burstSignal.type === 'unlock' || burstSignal.type === 'chapter') {
      const count = burstSignal.type === 'chapter' ? 5 : 7;
      const originX = p.ringX > 0 ? p.ringX : window.innerWidth * 0.5;
      const originY = p.ringY > 0 ? p.ringY : window.innerHeight * 0.5;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        const spd = 1.0 + Math.random() * 1.4;
        particlesRef.current.push({
          x: originX,
          y: originY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0,
          maxLife: 0.48,
          color: burstSignal.type === 'chapter' ? eraColorRef.current : '#A6C7A9',
          size: 1.8,
        });
      }
    }
  }, [burstSignal, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const p = posRef.current;
    let lastScrollY = window.scrollY;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let magneticTarget: HTMLElement | null = null;
    let rafId = 0;
    let lastTime = performance.now();

    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    const clearMagnetic = () => {
      if (magneticTarget) {
        magneticTarget.style.transform = '';
        magneticTarget = null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      p.targetX = e.clientX;
      p.targetY = e.clientY;
      p.visible = true;

      const dist = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY);
      if (dist > 14 && particlesRef.current.length < 24) {
        particlesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: (lastMouseX - e.clientX) * 0.04 + (Math.random() - 0.5) * 0.4,
          vy: (lastMouseY - e.clientY) * 0.04 + (Math.random() - 0.5) * 0.4,
          life: 0,
          maxLife: 0.36,
          color: eraColorRef.current,
          size: 1.5,
        });
      }
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      const target = e.target as HTMLElement | null;
      if (!target) {
        clearMagnetic();
        p.hoverKind = 'default';
        p.hoverLabel = '';
        return;
      }

      const kindEl = target.closest<HTMLElement>('[data-cursor-kind]');
      const magneticEl = target.closest<HTMLElement>('[data-magnetic]');
      const interactiveEl = target.closest<HTMLElement>('button, a, [role="button"], .artifact-card');

      if (magneticEl !== magneticTarget) {
        clearMagnetic();
        if (magneticEl) magneticTarget = magneticEl;
      }

      if (magneticTarget) {
        const rect = magneticTarget.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const dx = Math.max(-4, Math.min(4, (e.clientX - cx) * 0.08));
        const dy = Math.max(-4, Math.min(4, (e.clientY - cy) * 0.08));
        magneticTarget.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      }

      const explicitKind = kindEl?.dataset.cursorKind;
      if (explicitKind === 'discovery') {
        p.hoverKind = 'discovery';
        p.hoverLabel = kindEl?.dataset.cursorLabel ?? 'DISCOVERY';
      } else if (explicitKind === 'nav') {
        p.hoverKind = 'nav';
        p.hoverLabel = kindEl?.dataset.cursorLabel ?? '';
      } else if (interactiveEl) {
        p.hoverKind = 'interactive';
        p.hoverLabel = '';
      } else {
        p.hoverKind = 'default';
        p.hoverLabel = '';
      }
    };

    const onPointerLeave = () => {
      p.visible = false;
      clearMagnetic();
    };

    const onScroll = () => {
      const nextY = window.scrollY;
      const dy = nextY - lastScrollY;
      lastScrollY = nextY;
      p.scrollVel = Math.max(-18, Math.min(18, p.scrollVel + dy * 0.16));

      if (Math.abs(dy) > 12 && p.visible && particlesRef.current.length < 24) {
        particlesRef.current.push({
          x: p.ringX + (Math.random() - 0.5) * 14,
          y: p.ringY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.sign(dy) * (0.9 + Math.random() * 1.1),
          life: 0,
          maxLife: 0.42,
          color: eraColorRef.current,
          size: 1.4,
        });
      }
    };

    const onPointerDown = () => {
      p.rippleAge = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('resize', resizeCanvas);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Smooth lerp easing
      p.ringX += (p.targetX - p.ringX) * Math.min(1, dt * 16);
      p.ringY += (p.targetY - p.ringY) * Math.min(1, dt * 16);
      p.dotX += (p.targetX - p.dotX) * Math.min(1, dt * 32);
      p.dotY += (p.targetY - p.dotY) * Math.min(1, dt * 32);
      p.scrollVel *= Math.pow(0.08, dt);

      const effective3d = hovered3dRef.current;
      const isGolden =
        p.hoverKind === 'discovery' || effective3d === 'lost' || effective3d === 'secret';
      const isExpanded =
        p.hoverKind === 'interactive' ||
        p.hoverKind === 'nav' ||
        effective3d !== null;

      const tint = isGolden ? '#D9822B' : eraColorRef.current;
      const stretchY = 1 + Math.min(0.45, Math.abs(p.scrollVel) * 0.025);
      const scaleRing = (isGolden ? 1.55 : isExpanded ? 1.38 : 1.0) * (p.visible ? 1 : 0.4);

      if (ringRef.current) {
        ringRef.current.style.opacity = p.visible ? '1' : '0';
        ringRef.current.style.borderColor = tint;
        ringRef.current.style.transform = `translate3d(${p.ringX}px, ${p.ringY}px, 0) translate(-50%, -50%) scale(${scaleRing.toFixed(3)}, ${(scaleRing * stretchY).toFixed(3)})`;
      }

      if (dotRef.current) {
        dotRef.current.style.opacity = p.visible ? '1' : '0';
        dotRef.current.style.backgroundColor = tint;
        dotRef.current.style.transform = `translate3d(${p.dotX}px, ${p.dotY}px, 0) translate(-50%, -50%)`;
      }

      if (auraRef.current) {
        auraRef.current.style.opacity = p.visible ? (isGolden ? '0.22' : '0.11') : '0';
        auraRef.current.style.background = `radial-gradient(circle, ${tint} 0%, transparent 70%)`;
        auraRef.current.style.transform = `translate3d(${p.ringX}px, ${p.ringY}px, 0) translate(-50%, -50%)`;
      }

      if (labelRef.current) {
        const showNavTag = p.visible && p.hoverKind === 'nav' && Boolean(p.hoverLabel);
        labelRef.current.style.opacity = showNavTag ? '1' : '0';
        if (showNavTag) {
          labelRef.current.textContent = p.hoverLabel;
          labelRef.current.style.transform = `translate3d(${p.ringX + 18}px, ${p.ringY - 12}px, 0)`;
        }
      }

      if (rippleRef.current) {
        if (p.rippleAge < 0.45) {
          p.rippleAge += dt;
          const rp = Math.min(1, p.rippleAge / 0.45);
          rippleRef.current.style.opacity = String((1 - rp) * 0.75);
          rippleRef.current.style.borderColor = tint;
          rippleRef.current.style.transform = `translate3d(${p.ringX}px, ${p.ringY}px, 0) translate(-50%, -50%) scale(${(0.9 + rp * 1.45).toFixed(2)})`;
        } else {
          rippleRef.current.style.opacity = '0';
        }
      }

      // Draw lightweight particle trail
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const list = particlesRef.current;
          for (let i = list.length - 1; i >= 0; i--) {
            const pt = list[i];
            pt.life += dt;
            if (pt.life >= pt.maxLife) {
              list.splice(i, 1);
              continue;
            }
            pt.x += pt.vx;
            pt.y += pt.vy;
            const alpha = Math.max(0, 1 - pt.life / pt.maxLife) * 0.75;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      clearMagnetic();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="no-print fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" />
      <div
        ref={auraRef}
        className="fixed top-0 left-0 w-24 h-24 rounded-full pointer-events-none transition-opacity duration-200"
        style={{ opacity: 0, willChange: 'transform' }}
      />
      <div
        ref={rippleRef}
        className="fixed top-0 left-0 w-9 h-9 rounded-full border pointer-events-none"
        style={{ opacity: 0, willChange: 'transform' }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-7 h-7 rounded-full border-[1.25px] pointer-events-none transition-[border-color,opacity] duration-150"
        style={{ opacity: 0, willChange: 'transform' }}
      />
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full pointer-events-none"
        style={{ opacity: 0, willChange: 'transform' }}
      />
      <div
        ref={labelRef}
        className="fixed top-0 left-0 px-2 py-0.5 rounded bg-[#090B0D]/90 border border-white/15 text-[10px] font-mono-archival text-[#F0F2F2] pointer-events-none transition-opacity duration-150 whitespace-nowrap"
        style={{ opacity: 0, willChange: 'transform' }}
      />
    </div>
  );
};
