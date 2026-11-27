import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, Captions, Info, Send, Loader2 } from 'lucide-react';
import type { LessonStep, NodeColor, WhiteboardLesson, WhiteboardNode } from '../../lib/whiteboard/lessonSchema';
import { buildTimeline, nodeProgress, stepDurationMs } from '../../lib/whiteboard/timeline';
import { penTipForNode } from '../../lib/whiteboard/penTip';
import {
  defaultNarrationEngine as engine, genderForStep, getNarrationSupport, loadVoicePreference, saveVoicePreference,
  sentenceAtProgress, splitSentences, type VoiceOption, type VoicePreference,
} from '../../lib/whiteboard/narration';

const COLORS: Record<NodeColor, string> = {
  ink: '#1e293b',
  primary: '#007472',
  accent: '#d9603b',
  success: '#059669',
  danger: '#e11d48',
  muted: '#64748b',
};

/** Pencil marker shown at the point where the board is currently being written or drawn. */
function PenTip({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" opacity={0.95}>
      <circle r={14} fill={color} opacity={0.12} />
      <g transform="rotate(38)">
        <rect x={-3} y={-30} width={6} height={20} rx={2} fill={color} />
        <path d="M -3 -10 L 0 0.5 L 3 -10 Z" fill="#f3e2c7" />
        <path d="M -1.3 -4 L 0 0.5 L 1.3 -4 Z" fill={color} />
        <rect x={-3} y={-34} width={6} height={4.5} rx={1.6} fill="#94a3b8" />
      </g>
    </g>
  );
}

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
  // Reveal in the direction the text is actually written: Arabic right-to-left, digits and Latin left-to-right.
  const revealRtl = rtl && /[\u0600-\u06FF]/.test(node.text ?? '');
  const clipX = revealRtl ? left + width - width * progress : left;
  const penX = revealRtl ? clipX : clipX + width * progress;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={revealRtl ? clipX - (progress >= 1 ? size : 0) : clipX} y={node.y - size * 1.2} width={Math.max(0, reveal)} height={size * 1.8} />
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
      {progress > 0 && progress < 1 && <PenTip x={penX} y={node.y - size * 0.3} color={COLORS[node.color]} />}
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
      const tip = penTipForNode(node, progress, rtl);
      // Once the label starts revealing, the pen belongs to the label (RevealText renders it there).
      const showPen = progress > 0 && progress < 1 && !(node.text && progress > 0.4) && tip;
      return (
        <g>
          {node.type === 'rectangle'
            ? <rect x={node.x} y={node.y} width={w} height={h} rx={14} {...common} />
            : <ellipse cx={node.x + w / 2} cy={node.y + h / 2} rx={w / 2} ry={h / 2} {...common} />}
          {node.text && <RevealText node={{ ...node, x: node.x + w / 2, y: node.y + h / 2 + (node.fontSize ?? 32) / 3, align: 'center' }} progress={Math.max(0, (progress - 0.4) / 0.6)} rtl={rtl} />}
          {showPen && <PenTip x={tip.x} y={tip.y} color={color} />}
        </g>
      );
    }
    case 'highlight': {
      const w = (node.w ?? 0) * progress;
      const tip = penTipForNode(node, progress, rtl);
      return (
        <g>
          <rect x={rtl ? node.x + (node.w ?? 0) - w : node.x} y={node.y} width={w} height={node.h} rx={10} fill={color} opacity={0.28} />
          {progress > 0 && progress < 1 && tip && <PenTip x={tip.x} y={tip.y} color={color} />}
        </g>
      );
    }
    case 'line':
    case 'arrow': {
      const x2 = node.x + ((node.x2 ?? node.x) - node.x) * progress;
      const y2 = node.y + ((node.y2 ?? node.y) - node.y) * progress;
      return (
        <g>
          <line x1={node.x} y1={node.y} x2={x2} y2={y2} stroke={color} strokeWidth={5} strokeLinecap="round" />
          {node.type === 'arrow' && progress > 0.2 && <Arrowhead x1={node.x} y1={node.y} x2={x2} y2={y2} color={color} opacity={1} />}
          {progress > 0 && progress < 1 && <PenTip x={x2} y={y2} color={color} />}
        </g>
      );
    }
    default:
      return null;
  }
}

export type AskResult = { ok: true; step: LessonStep } | { ok: false; error: string };

export interface WhiteboardPlayerProps {
  lesson: WhiteboardLesson;
  /** When set, the learner can ask a question mid-lesson; the answer comes back as a validated branch step. */
  onAsk?: (question: string, ctx: { lesson: WhiteboardLesson; stepIndex: number }) => Promise<AskResult>;
}

export function WhiteboardPlayer({ lesson: initialLesson, onAsk }: WhiteboardPlayerProps) {
  const [lesson, setLesson] = useState(initialLesson);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [offerResume, setOfferResume] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tInStep, setTInStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [voiceInfo, setVoiceInfo] = useState(() => getNarrationSupport(stepLang));
  const reduced = useMemo(prefersReducedMotion, []);
  const [voicePref, setVoicePref] = useState<VoicePreference>(() => { try { return loadVoicePreference(); } catch { return 'female'; } });
  const [voiceId, setVoiceId] = useState<string>('');
  const [voiceList, setVoiceList] = useState<VoiceOption[]>([]);
  const resumeFromRef = useRef(0);
  const speechDoneRef = useRef(true);
  const stopSpeechRef = useRef<() => void>(() => undefined);

  const step = lesson.steps[stepIndex];
  // Language is per step: a lesson can mix Arabic and English steps; the board direction, captions and voice follow the step.
  const stepLang: 'ar' | 'en' = step?.lang ?? lesson.lang;
  const isAr = stepLang === 'ar';
  const durations = useMemo(() => buildTimeline(lesson, rate), [lesson, rate]);
  const duration = durations.steps[stepIndex]?.durationMs ?? stepDurationMs(step, rate);
  const isLast = stepIndex === lesson.steps.length - 1;

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    const s = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    if (!s) return;
    const update = () => { setVoiceInfo(getNarrationSupport(stepLang)); setVoiceList(engine.voices(stepLang)); };
    update();
    s.addEventListener?.('voiceschanged', update);
    return () => s.removeEventListener?.('voiceschanged', update);
  }, [stepLang]);

  const stopSpeech = useCallback(() => { stopSpeechRef.current(); stopSpeechRef.current = () => undefined; engine.cancel(); }, []);

  const startSpeech = useCallback((index: number, fromSentence = 0) => {
    stopSpeech();
    if (muted || !voiceInfo.hasVoiceForLang) { speechDoneRef.current = true; return; }
    speechDoneRef.current = false;
    stopSpeechRef.current = engine.speak({
      text: lesson.steps[index].narration, lang: lesson.steps[index].lang ?? lesson.lang, rate,
      gender: genderForStep(voicePref, index), voiceId: voiceId || null, fromSentence,
      onEnd: () => { speechDoneRef.current = true; },
    });
  }, [lesson.steps, lesson.lang, muted, rate, stopSpeech, voiceInfo.hasVoiceForLang, voicePref, voiceId]);

  // Animation clock: one GSAP tween per step drives the step time (ease none), so pause, seek and the narration sync all work off one timeline.
  const tRef = useRef(0);
  tRef.current = tInStep;
  useEffect(() => {
    if (!playing) return;
    const proxy = { t: Math.min(tRef.current, duration) };
    let grace: gsap.core.Tween | null = null;
    let waited = 0;
    const finish = () => {
      // The step advances once both the drawing time and the narration are finished.
      if (!speechDoneRef.current && waited < 12_000) {
        waited += 100;
        grace = gsap.delayedCall(0.1, finish);
        return;
      }
      if (isLast) { setPlaying(false); stopSpeech(); setTInStep(duration); return; }
      if (step.branch) { setPlaying(false); stopSpeech(); setOfferResume(true); setTInStep(duration); return; }
      setStepIndex(i => i + 1);
      setTInStep(0);
    };
    const tween = gsap.to(proxy, {
      t: duration,
      duration: Math.max(0, duration - proxy.t) / 1000,
      ease: 'none',
      onUpdate: () => setTInStep(proxy.t),
      onComplete: finish,
    });
    return () => { tween.kill(); grace?.kill(); };
  }, [playing, stepIndex, duration, isLast, stopSpeech, step.branch]);

  // Speak whenever playback is active on a new step.
  const spokenStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) { spokenStepRef.current = null; return; }
    if (spokenStepRef.current !== stepIndex) { spokenStepRef.current = stepIndex; startSpeech(stepIndex, resumeFromRef.current); resumeFromRef.current = 0; }
  }, [playing, stepIndex, startSpeech]);

  useEffect(() => () => stopSpeech(), [stopSpeech]);
  useEffect(() => { if (muted) stopSpeech(); }, [muted, stopSpeech]);

  const goTo = (index: number) => {
    const clamped = Math.min(lesson.steps.length - 1, Math.max(0, index));
    stopSpeech();
    spokenStepRef.current = null;
    resumeFromRef.current = 0;
    setStepIndex(clamped);
    setTInStep(playing ? 0 : durations.steps[clamped]?.durationMs ?? 0);
  };

  const togglePlay = () => {
    if (playing) {
      // Pausing stops the voice too. Remember the sentence so resuming restarts from its beginning.
      resumeFromRef.current = sentenceAtProgress(splitSentences(step.narration), duration > 0 ? tInStep / duration : 0);
      setPlaying(false); stopSpeech(); spokenStepRef.current = null;
      return;
    }
    const finished = isLast && tInStep >= duration;
    if (finished) { setStepIndex(0); setTInStep(0); resumeFromRef.current = 0; }
    else if (tInStep >= duration) { resumeFromRef.current = 0; setTInStep(0); }
    spokenStepRef.current = null;
    setPlaying(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(stepIndex + (isAr ? -1 : 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(stepIndex + (isAr ? 1 : -1)); }
  };

  const pauseForQuestion = () => {
    if (!playing) return;
    resumeFromRef.current = sentenceAtProgress(splitSentences(step.narration), duration > 0 ? tInStep / duration : 0);
    setPlaying(false); stopSpeech(); spokenStepRef.current = null;
  };

  const ask = async () => {
    const q = question.trim();
    if (!onAsk || q.length < 2 || asking) return;
    pauseForQuestion();
    setAsking(true); setAskError(null);
    try {
      const res = await onAsk(q, { lesson, stepIndex });
      if ('error' in res) { setAskError(res.error); return; }
      const at = stepIndex;
      setLesson(l => ({ ...l, steps: [...l.steps.slice(0, at + 1), res.step, ...l.steps.slice(at + 1)] }));
      setQuestion(''); setOfferResume(false);
      resumeFromRef.current = 0; spokenStepRef.current = null;
      setStepIndex(at + 1); setTInStep(0); setPlaying(true);
    } catch (e: any) {
      setAskError(e?.message || (isAr ? 'تعذر الحصول على إجابة.' : 'Could not get an answer.'));
    } finally { setAsking(false); }
  };

  const resumeOriginal = () => {
    setOfferResume(false);
    if (isLast) return;
    goTo(stepIndex + 1);
    spokenStepRef.current = null; setTInStep(0); setPlaying(true);
  };

  // A step that continues keeps the earlier drawing on the board, fully drawn.
  const carriedSteps = (): LessonStep[] => {
    const out: LessonStep[] = [];
    for (let i = stepIndex; i > 0 && lesson.steps[i].continues; i--) out.unshift(lesson.steps[i - 1]);
    return out;
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
      {step.title && <div className="text-xs font-black text-teal-600" data-testid="whiteboard-step-title">{`${step.branch ? (isAr ? 'سؤالك: ' : 'Your question: ') : `${stepIndex + 1}. `}${step.title}`}</div>}
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-[#fdfcf8]">
        <svg viewBox={`0 0 ${lesson.canvas.width} ${lesson.canvas.height}`} className="w-full h-auto block" role="img" aria-label={step.title || lesson.title}>
          <defs>
            <pattern id="wb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e7e5df" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={lesson.canvas.width} height={lesson.canvas.height} fill="url(#wb-grid)" />
          <g key={stepIndex}>
            {carriedSteps().map(cs => <g key={`carry-${cs.id}`}>{cs.nodes.map(n => <BoardNode key={`${cs.id}-${n.id}`} node={n} progress={1} rtl={(cs.lang ?? lesson.lang) === 'ar'} />)}</g>)}
            {renderStep(step, stepIndex)}
          </g>
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

      {offerResume && !isLast && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-3 text-xs" data-testid="whiteboard-resume-offer">
          <span className="font-black text-slate-700 dark:text-slate-200">{isAr ? 'هل وضحت الإجابة؟ نكمل الدرس الأصلي من الخطوة التالية؟' : 'Did that answer help? Shall we continue the original lesson from the next step?'}</span>
          <button type="button" onClick={resumeOriginal} className="bg-primary text-white font-black px-3 py-2 rounded-xl">{isAr ? 'متابعة الدرس الأصلي' : 'Resume the lesson'}</button>
        </div>
      )}
      {onAsk && (
        <div className="space-y-1" data-testid="whiteboard-ask">
          <div className="flex items-center gap-2">
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); void ask(); } }} maxLength={500}
              placeholder={isAr ? 'عندك سؤال؟ اكتبه وسأتوقف وأشرحه على نفس السبورة' : 'Have a question? Type it and I will pause and explain on this board'}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs" aria-label={isAr ? 'سؤال أثناء الدرس' : 'Question during the lesson'} />
            <button type="button" onClick={() => void ask()} disabled={asking || question.trim().length < 2} className="inline-flex items-center gap-1.5 bg-primary text-white font-black text-xs px-3 py-2.5 rounded-xl disabled:opacity-50">
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{isAr ? 'اسأل' : 'Ask'}
            </button>
          </div>
          {askError && <p role="alert" className="text-xs text-rose-500">{askError}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="whiteboard-voice-controls">
        <label className="font-black text-slate-500">{isAr ? 'المعلّم' : 'Narrator'}</label>
        <select value={voicePref} onChange={e => { const v = e.target.value as VoicePreference; setVoicePref(v); saveVoicePreference(v); }} aria-label={isAr ? 'صوت المعلّم' : 'Narrator voice'}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent font-black px-2 py-2">
          <option value="female">{isAr ? 'معلّمة (صوت أنثوي)' : 'Teacher (female voice)'}</option>
          <option value="male">{isAr ? 'معلّم (صوت ذكوري)' : 'Teacher (male voice)'}</option>
          <option value="alternate">{isAr ? 'تبادل بين الاثنين' : 'Alternate both'}</option>
        </select>
        {voiceList.length > 1 && voicePref !== 'alternate' && (
          <select value={voiceId} onChange={e => setVoiceId(e.target.value)} aria-label={isAr ? 'اختيار صوت محدد' : 'Pick a specific voice'}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-2 max-w-[220px]">
            <option value="">{isAr ? 'تلقائي' : 'Automatic'}</option>
            {voiceList.map(v => <option key={v.id} value={v.id}>{v.name}{v.gender !== 'unknown' ? (v.gender === 'female' ? ' ♀' : ' ♂') : ''}</option>)}
          </select>
        )}
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
