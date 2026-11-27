import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, Captions, Info } from 'lucide-react';
import type { NodeColor, WhiteboardLesson, WhiteboardNode } from '../../lib/whiteboard/lessonSchema';
import { buildTimeline, nodeProgress, stepDurationMs } from '../../lib/whiteboard/timeline';
import { cancelNarration, getNarrationSupport, speak } from '../../lib/whiteboard/narration';

const COLORS: Record<NodeColor, string> = {
  ink: '#1e293b',
  primary: '#007472',
  accent: '#d9603b',
  success: '#059669',
  danger: '#e11d48',
  muted: '#64748b',
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function RevealText({ node, progress, rtl }: { node: WhiteboardNode; progress: number; rtl: boolean }) {
  const ref = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState(() => (node.text?.length ?? 1) * (node.fontSize ?? 32) * 0.55);
  useLayoutEffect(() => {
    const len = ref.current?.getComputedTextLength?.();
    if (len && Number.isFinite(len) && len > 0) setWidth(len);
  }, [node.text, node.fontSize]);

  const align = node.align ?? 'start';
  const size = node.fontSize ?? 32;
  const anchor = align === 'center' ? 'middle' : align;
  // Left edge of the full text box in board coordinates.
  const left = align === 'center'
    ? node.x - width / 2
    : (align === 'start') === rtl ? node.x - width : node.x;
  const clipId = `clip-${node.id}-${Math.round(node.x)}-${Math.round(node.y)}`;
  const reveal = width * progress + (progress >= 1 ? size : 0);
  const clipX = rtl ? left + width - width * progress : left;
  const penX = rtl ? clipX : clipX + width * progress;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={rtl ? clipX - (progress >= 1 ? size : 0) : clipX} y={node.y - size * 1.2} width={Math.max(0, reveal)} height={size * 1.8} />
        </clipPath>
      </defs>
      <text
        ref={ref}
        x={node.x}
        y={node.y}
        fontSize={size}
        fontWeight={700}
        fill={COLORS[node.color]}
        textAnchor={anchor}
        direction={rtl ? 'rtl' : 'ltr'}
        clipPath={`url(#${clipId})`}
        style={{ fontFamily: 'inherit' }}
      >
        {node.text}
      </text>
      {progress > 0 && progress < 1 && (
        <circle cx={penX} cy={node.y - size * 0.3} r={Math.max(5, size * 0.12)} fill={COLORS[node.color]} opacity={0.85} />
      )}
    </g>
  );
}

function Arrowhead({ x1, y1, x2, y2, color, opacity }: { x1: number; y1: number; x2: number; y2: number; color: string; opacity: number }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const s = 18;
  const p = (a: number) => `${x2 - s * Math.cos(angle + a)},${y2 - s * Math.sin(angle + a)}`;
  return <polygon points={`${x2},${y2} ${p(0.45)} ${p(-0.45)}`} fill={color} opacity={opacity} />;
}

function BoardNode({ node, progress, rtl }: { node: WhiteboardNode; progress: number; rtl: boolean }) {
  if (progress <= 0) return null;
  const color = COLORS[node.color];
  switch (node.type) {
    case 'text':
      return <RevealText node={node} progress={progress} rtl={rtl} />;
    case 'rectangle':
    case 'ellipse': {
      const common = { stroke: color, strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - progress, fill: color, fillOpacity: progress >= 1 ? 0.06 : 0 };
      const w = node.w ?? 0; const h = node.h ?? 0;
      return (
        <g>
          {node.type === 'rectangle'
            ? <rect x={node.x} y={node.y} width={w} height={h} rx={14} {...common} />
            : <ellipse cx={node.x + w / 2} cy={node.y + h / 2} rx={w / 2} ry={h / 2} {...common} />}
          {node.text && <RevealText node={{ ...node, x: node.x + w / 2, y: node.y + h / 2 + (node.fontSize ?? 32) / 3, align: 'center' }} progress={Math.max(0, (progress - 0.4) / 0.6)} rtl={rtl} />}
        </g>
      );
    }
    case 'highlight': {
      const w = (node.w ?? 0) * progress;
      return <rect x={rtl ? node.x + (node.w ?? 0) - w : node.x} y={node.y} width={w} height={node.h} rx={10} fill={color} opacity={0.28} />;
    }
    case 'line':
    case 'arrow': {
      const x2 = node.x + ((node.x2 ?? node.x) - node.x) * progress;
      const y2 = node.y + ((node.y2 ?? node.y) - node.y) * progress;
      return (
        <g>
          <line x1={node.x} y1={node.y} x2={x2} y2={y2} stroke={color} strokeWidth={5} strokeLinecap="round" />
          {node.type === 'arrow' && progress > 0.2 && <Arrowhead x1={node.x} y1={node.y} x2={x2} y2={y2} color={color} opacity={1} />}
        </g>
      );
    }
    default:
      return null;
  }
}

export interface WhiteboardPlayerProps {
  lesson: WhiteboardLesson;
}

export function WhiteboardPlayer({ lesson }: WhiteboardPlayerProps) {
  const isAr = lesson.lang === 'ar';
  const [stepIndex, setStepIndex] = useState(0);
  const [tInStep, setTInStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [voiceInfo, setVoiceInfo] = useState(() => getNarrationSupport(lesson.lang));
  const reduced = useMemo(prefersReducedMotion, []);
  const speechDoneRef = useRef(true);
  const stopSpeechRef = useRef<() => void>(() => undefined);

  const step = lesson.steps[stepIndex];
  const durations = useMemo(() => buildTimeline(lesson, rate), [lesson, rate]);
  const duration = durations.steps[stepIndex]?.durationMs ?? stepDurationMs(step, rate);
  const isLast = stepIndex === lesson.steps.length - 1;

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    const s = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    if (!s) return;
    const update = () => setVoiceInfo(getNarrationSupport(lesson.lang));
    update();
    s.addEventListener?.('voiceschanged', update);
    return () => s.removeEventListener?.('voiceschanged', update);
  }, [lesson.lang]);

  const stopSpeech = useCallback(() => { stopSpeechRef.current(); stopSpeechRef.current = () => undefined; cancelNarration(); }, []);

  const startSpeech = useCallback((index: number) => {
    stopSpeech();
    if (muted || !voiceInfo.hasVoiceForLang) { speechDoneRef.current = true; return; }
    speechDoneRef.current = false;
    stopSpeechRef.current = speak(lesson.steps[index].narration, lesson.lang, rate, () => { speechDoneRef.current = true; });
  }, [lesson.steps, lesson.lang, muted, rate, stopSpeech, voiceInfo.hasVoiceForLang]);

  // Animation clock. The step advances once both the drawing time and the narration are finished.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let graceMs = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setTInStep(prev => {
        const next = prev + dt;
        if (next < duration) return next;
        if (!speechDoneRef.current && graceMs < 12_000) { graceMs += dt; return duration; }
        if (isLast) { setPlaying(false); stopSpeech(); return duration; }
        setStepIndex(i => i + 1);
        return 0;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, isLast, stopSpeech]);

  // Speak whenever playback is active on a new step.
  const spokenStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) { spokenStepRef.current = null; return; }
    if (spokenStepRef.current !== stepIndex) { spokenStepRef.current = stepIndex; startSpeech(stepIndex); }
  }, [playing, stepIndex, startSpeech]);

  useEffect(() => () => stopSpeech(), [stopSpeech]);
  useEffect(() => { if (muted) stopSpeech(); }, [muted, stopSpeech]);

  const goTo = (index: number) => {
    const clamped = Math.min(lesson.steps.length - 1, Math.max(0, index));
    stopSpeech();
    spokenStepRef.current = null;
    setStepIndex(clamped);
    setTInStep(playing ? 0 : durations.steps[clamped]?.durationMs ?? 0);
  };

  const togglePlay = () => {
    if (playing) { setPlaying(false); stopSpeech(); return; }
    // Replay from the start of the step (or from the beginning when the lesson already finished).
    if (isLast && tInStep >= duration) { setStepIndex(0); }
    setTInStep(0);
    spokenStepRef.current = null;
    setPlaying(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(stepIndex + (isAr ? -1 : 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(stepIndex + (isAr ? 1 : -1)); }
  };

  const renderStep = (s: typeof step, idx: number) =>
    s.nodes.map((node, ni) => {
      const progress = idx < stepIndex || reduced
        ? 1
        : nodeProgress(s, ni, tInStep, duration);
      return <BoardNode key={`${s.id}-${node.id}`} node={node} progress={progress} rtl={isAr} />;
    });

  const caption = step.narration;
  const t = {
    play: isAr ? 'تشغيل' : 'Play',
    pause: isAr ? 'إيقاف مؤقت' : 'Pause',
    next: isAr ? 'الخطوة التالية' : 'Next step',
    prev: isAr ? 'الخطوة السابقة' : 'Previous step',
    mute: isAr ? 'كتم الصوت' : 'Mute',
    unmute: isAr ? 'تشغيل الصوت' : 'Unmute',
    captions: isAr ? 'النص المصاحب' : 'Captions',
    step: isAr ? 'الخطوة' : 'Step',
  };

  return (
    <div className="space-y-3" dir={isAr ? 'rtl' : 'ltr'} onKeyDown={onKeyDown} tabIndex={0} aria-label={lesson.title} data-testid="whiteboard-player">
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-[#fdfcf8]">
        <svg viewBox={`0 0 ${lesson.canvas.width} ${lesson.canvas.height}`} className="w-full h-auto block" role="img" aria-label={step.title || lesson.title}>
          <defs>
            <pattern id="wb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e7e5df" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={lesson.canvas.width} height={lesson.canvas.height} fill="url(#wb-grid)" />
          {step.title && <text x={isAr ? lesson.canvas.width - 40 : 40} y={44} fontSize={26} fill="#94a3b8" textAnchor="start" direction={isAr ? 'rtl' : 'ltr'} fontWeight={700}>{step.title}</text>}
          <g key={stepIndex}>{renderStep(step, stepIndex)}</g>
        </svg>
      </div>

      {captions && (
        <p className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 px-4 py-3 text-sm leading-7 text-slate-700 dark:text-slate-200" aria-live="polite" data-testid="whiteboard-caption">
          {caption}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} aria-label={t.prev} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40">
          {isAr ? <SkipForward className="w-4 h-4" /> : <SkipBack className="w-4 h-4" />}
        </button>
        <button type="button" onClick={togglePlay} aria-label={playing ? t.pause : t.play} className="uipro-btn-tactile inline-flex items-center gap-2 bg-primary text-white font-black text-sm px-5 py-2.5 rounded-xl">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{playing ? t.pause : t.play}</span>
        </button>
        <button type="button" onClick={() => goTo(stepIndex + 1)} disabled={isLast} aria-label={t.next} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40">
          {isAr ? <SkipBack className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
        </button>
        <input type="range" min={0} max={lesson.steps.length - 1} value={stepIndex} onChange={e => goTo(Number(e.target.value))}
          className="flex-1 min-w-[120px] accent-[#007472]" aria-label={`${t.step} ${stepIndex + 1} / ${lesson.steps.length}`} />
        <span className="text-xs font-black text-slate-500 tabular-nums">{stepIndex + 1}/{lesson.steps.length}</span>
        <select value={rate} onChange={e => setRate(Number(e.target.value))} aria-label={isAr ? 'السرعة' : 'Speed'} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-black px-2 py-2">
          {[0.75, 1, 1.25, 1.5].map(r => <option key={r} value={r}>{r}x</option>)}
        </select>
        <button type="button" onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={muted ? t.unmute : t.mute} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => setCaptions(c => !c)} aria-pressed={captions} aria-label={t.captions} className={`p-2.5 rounded-xl border ${captions ? 'border-primary text-primary' : 'border-slate-200 dark:border-slate-700'}`}>
          <Captions className="w-4 h-4" />
        </button>
      </div>

      {!voiceInfo.supported && (
        <p className="flex items-center gap-2 text-[11px] text-slate-400"><Info className="w-3.5 h-3.5" />{isAr ? 'متصفحك لا يدعم النطق، سيُعرض الدرس بالنص المصاحب.' : 'Your browser has no speech support; the lesson plays with captions.'}</p>
      )}
      {voiceInfo.supported && !voiceInfo.hasVoiceForLang && (
        <p className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400"><Info className="w-3.5 h-3.5" />{isAr ? 'لا يوجد صوت عربي على هذا الجهاز، سيُعرض الدرس بالنص المصاحب دون صوت.' : 'No voice for this language on this device; playing with captions only.'}</p>
      )}
    </div>
  );
}

export default WhiteboardPlayer;
