import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Pause, Play, Pencil, SkipBack, SkipForward, Target, Trash2, Volume2, VolumeX, Captions, Info, Send, Loader2, ZoomIn, ZoomOut, Maximize, FileDown, PenLine, Mic, Square } from 'lucide-react';
import type { LessonStep, NodeColor, WhiteboardLesson, WhiteboardNode } from '../../lib/whiteboard/lessonSchema';
import { buildTimeline, nodeProgress, stepDurationMs } from '../../lib/whiteboard/timeline';
import { penTipForNode, curvePoint } from '../../lib/whiteboard/penTip';
import { appendPoint, boardPoint, pointsToPath, type FreehandPoint, type FreehandStroke } from '../../lib/whiteboard/freehand';
import { captureBoardPng } from '../../lib/whiteboard/boardSnapshot';
import { loadStickerInner } from '../../lib/whiteboard/stickers';
import { speakWithMunsit, prefetchMunsitClip } from '../../lib/whiteboard/munsitVoice';
import { requestLessonStt } from '../../services/aiWorkerClient';
import { stripDiacritics } from '../../lib/whiteboard/lessonSchema';
import { exportLessonPdf } from '../../lib/whiteboard/lessonPdf';
import { ICONS, type IconName } from '../../lib/whiteboard/icons';
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
function PenTip({ x, y, color, wiggle = 0 }: { x: number; y: number; color: string; wiggle?: number }) {
  // Gentle scribbling sway, a pure function of draw progress so pause/seek stays deterministic.
  const sway = Math.sin(wiggle * Math.PI * 8) * 6;
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" opacity={0.98}>
      <circle r={26} fill={color} opacity={0.14} />
      <g transform={`rotate(${40 + sway})`}>
        <rect x={-5.5} y={-52} width={11} height={34} rx={3} fill={color} stroke="#ffffff" strokeWidth={2.5} />
        <path d="M -5.5 -18 L 0 1 L 5.5 -18 Z" fill="#f3e2c7" stroke="#ffffff" strokeWidth={1.5} />
        <path d="M -2.2 -7 L 0 1 L 2.2 -7 Z" fill={color} />
        <rect x={-5.5} y={-59} width={11} height={8} rx={2.5} fill="#94a3b8" stroke="#ffffff" strokeWidth={2} />
      </g>
    </g>
  );
}

/** Small celebratory pop as a node finishes drawing: scale 1 -> 1.06 -> 1 across the last 20%. */
function popTransform(progress: number, cx: number, cy: number): string | undefined {
  if (progress <= 0.8 || progress >= 1) return undefined;
  const s = 1 + 0.06 * Math.sin(((progress - 0.8) / 0.2) * Math.PI);
  return `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function RevealText({ node, progress, rtl, vcenter }: { node: WhiteboardNode; progress: number; rtl: boolean; vcenter?: boolean }) {
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
          <rect x={revealRtl ? clipX - (progress >= 1 ? size : 0) : clipX} y={vcenter ? node.y - size : node.y - size * 1.2} width={Math.max(0, reveal)} height={size * 2} />
        </clipPath>
      </defs>
      <text
        ref={ref}
        x={node.x}
        y={node.y}
        dominantBaseline={vcenter ? 'central' : undefined}
        fontSize={size}
        fontWeight={700}
        fill={COLORS[node.color]}
        textAnchor={anchor}
        direction={rtl ? 'rtl' : 'ltr'}
        clipPath={`url(#${clipId})`}
        style={{ fontFamily: size >= 44 ? "'Aref Ruqaa', 'Molhim', 'Cairo', serif" : "'Molhim', 'Aref Ruqaa', 'Cairo', serif" }}
      >
        {node.text}
      </text>
      {progress > 0 && progress < 1 && <PenTip x={penX} y={vcenter ? node.y + size * 0.35 : node.y - size * 0.3} color={COLORS[node.color]} wiggle={progress} />}
    </g>
  );
}

function Arrowhead({ x1, y1, x2, y2, color, opacity, scale = 1 }: { x1: number; y1: number; x2: number; y2: number; color: string; opacity: number; scale?: number }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const s = 18 * Math.max(0.2, Math.min(1, scale));
  const p = (a: number) => `${x2 - s * Math.cos(angle + a)},${y2 - s * Math.sin(angle + a)}`;
  return <polygon points={`${x2},${y2} ${p(0.45)} ${p(-0.45)}`} fill={color} opacity={opacity} />;
}

/** Freehand SVG path, stroke-drawn with the pen riding the measured path length. */
function PathNode({ node, progress, color }: { node: WhiteboardNode; progress: number; color: string }) {
  const ref = useRef<SVGPathElement>(null);
  let tip: { x: number; y: number } | null = null;
  if (progress > 0 && progress < 1 && ref.current) {
    try {
      const len = ref.current.getTotalLength();
      if (Number.isFinite(len) && len > 0) tip = ref.current.getPointAtLength(len * progress);
    } catch { tip = null; }
  }
  return (
    <g>
      <path ref={ref} d={node.d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
      {tip && <PenTip x={tip.x} y={tip.y} color={color} wiggle={progress} />}
    </g>
  );
}

/** An illustration from the icon library, drawn part by part, with labels pinned to named anchors. */
function IconNode({ node, progress, rtl }: { node: WhiteboardNode; progress: number; rtl: boolean }) {
  const def = ICONS[node.name as IconName];
  if (!def) return null;
  const color = COLORS[node.color];
  const w = node.w ?? 200; const h = node.h ?? 200;
  const sx = w / def.viewBox; const sy = h / def.viewBox;
  const n = def.parts.length;
  const common = { fill: 'none', stroke: color, strokeWidth: 5 / Math.max(sx, sy), strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, pathLength: 1 };
  return (
    <g transform={popTransform(progress, node.x + w / 2, node.y + h / 2)}>
      <g transform={`translate(${node.x} ${node.y}) scale(${sx} ${sy})`}>
        {def.parts.map((part, i) => {
          const pp = Math.min(1, Math.max(0, progress * n - i));
          if (pp <= 0) return null;
          const draw = { ...common, strokeDasharray: 1, strokeDashoffset: 1 - pp };
          switch (part.kind) {
            case 'path': return <path key={i} d={part.d} {...draw} />;
            case 'circle': return <circle key={i} cx={part.cx} cy={part.cy} r={part.r} {...draw} />;
            case 'ellipse': return <ellipse key={i} cx={part.cx} cy={part.cy} rx={part.rx} ry={part.ry} transform={part.rotate ? `rotate(${part.rotate} ${part.cx} ${part.cy})` : undefined} {...draw} />;
            case 'line': return <line key={i} x1={part.x1} y1={part.y1} x2={part.x2} y2={part.y2} {...draw} />;
            default: return null;
          }
        })}
      </g>
      {(node.labels ?? []).map((label, i) => {
        const a = def.anchors[label.anchor];
        if (!a) return null;
        const ax = node.x + a.x * sx; const ay = node.y + a.y * sy;
        const outX = Math.sign(a.x - def.viewBox / 2) || (rtl ? -1 : 1);
        const outY = Math.sign(a.y - def.viewBox / 2) || -1;
        const lx = ax + outX * 20; const ly = ay + outY * 20;
        const revealed = !label.teaser || progress >= 0.95;
        if (label.teaser && progress < 0.35) return null;
        return (
          <g key={`label-${i}`}>
            {revealed ? (
              <RevealText node={{ id: `${node.id}-l${i}`, type: 'text', x: lx, y: ly, text: label.text, fontSize: 28, color: node.color, align: 'center' }} progress={Math.min(1, Math.max(0, (progress - 0.6) / 0.35))} rtl={rtl} />
            ) : (
              <g>
                <circle cx={lx} cy={ly - 10} r={17} fill={color} opacity={0.14} />
                <text x={lx} y={ly} fontSize={30} fontWeight={900} fill={color} textAnchor="middle">?</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** A catalog pictogram, stamped in with an overshoot bounce. OpenMoji art is 72x72. */
function StickerNode({ node, progress }: { node: WhiteboardNode; progress: number }) {
  const [inner, setInner] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (node.name) void loadStickerInner(node.name).then(m => { if (live) setInner(m); });
    return () => { live = false; };
  }, [node.name]);
  const w = node.w ?? 160; const h = node.h ?? 160;
  const t = Math.min(1, Math.max(0, progress));
  const c1 = 1.70158; const c3 = c1 + 1;
  const ease = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); // easeOutBack
  const s = Math.max(0.001, ease);
  const cx = node.x + w / 2; const cy = node.y + h / 2;
  if (!inner) return null;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} opacity={Math.min(1, t * 2)}>
      <g transform={`translate(${node.x} ${node.y}) scale(${w / 72} ${h / 72})`} dangerouslySetInnerHTML={{ __html: inner }} />
    </g>
  );
}

/** The spoken explanation, written on the board line by line as the teacher says it (diacritic-free).
 *  Shows the last few wrapped lines of the typed prefix, with the pen at the writing position. */

/**
 * Generated lessons sometimes place a standalone label inside a hand-drawn box
 * (rect/ellipse with no text of its own). Arabic fonts carry a ~1.35em ascent,
 * so a label whose baseline looks fine can ink above the box border. This pass
 * nudges such labels (and shrinks them if needed) so their ink fits the box.
 */
const INK_ASCENT = 1.65;  // em above baseline; Aref Ruqaa measures ~1.54em live
const INK_DESCENT = 0.45; // em below baseline
export function fitLabelsIntoBoxes(nodes: WhiteboardNode[]): WhiteboardNode[] {
  const boxes = nodes.filter(n => (n.type === 'rectangle' || n.type === 'ellipse') && !n.text && (n.w ?? 0) > 0 && (n.h ?? 0) > 0);
  if (!boxes.length) return nodes;
  return nodes.map(n => {
    if (n.type !== 'text' || !n.text) return n;
    const size = n.fontSize ?? 32;
    const cx = n.x; // anchor point; good enough for containment (labels are center-aligned in practice)
    const box = boxes
      .filter(b => cx >= (b.x) && cx <= (b.x + (b.w ?? 0)) && n.y > (b.y) - size * 0.5 && n.y < (b.y + (b.h ?? 0)) + size * 0.5)
      .sort((a, b2) => (a.w ?? 0) * (a.h ?? 0) - (b2.w ?? 0) * (b2.h ?? 0))[0];
    if (!box) return n;
    const bh = box.h ?? 0;
    let fs = size;
    if ((INK_ASCENT + INK_DESCENT) * fs > bh - 8) fs = Math.max(18, Math.floor((bh - 8) / (INK_ASCENT + INK_DESCENT)));
    const minY = box.y + 4 + INK_ASCENT * fs;
    const maxY = box.y + bh - 4 - INK_DESCENT * fs;
    const y = minY > maxY ? box.y + bh / 2 + ((INK_ASCENT - INK_DESCENT) * fs) / 2 : Math.min(maxY, Math.max(minY, n.y));
    if (fs === size && y === n.y) return n;
    return { ...n, y: Math.round(y), fontSize: fs };
  });
}

export function BoardNode({ node, progress, rtl }: { node: WhiteboardNode; progress: number; rtl: boolean }) {
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
        <g transform={popTransform(progress, node.x + w / 2, node.y + h / 2)}>
          {node.type === 'rectangle'
            ? <rect x={node.x} y={node.y} width={w} height={h} rx={14} {...common} />
            : <ellipse cx={node.x + w / 2} cy={node.y + h / 2} rx={w / 2} ry={h / 2} {...common} />}
          {node.text && <RevealText node={{ ...node, x: node.x + w / 2, y: node.y + h / 2, align: 'center' }} progress={Math.max(0, (progress - 0.4) / 0.6)} rtl={rtl} vcenter />}
          {showPen && <PenTip x={tip.x} y={tip.y} color={color} wiggle={progress} />}
        </g>
      );
    }
    case 'highlight': {
      const w = (node.w ?? 0) * progress;
      const tip = penTipForNode(node, progress, rtl);
      return (
        <g>
          <rect x={rtl ? node.x + (node.w ?? 0) - w : node.x} y={node.y} width={w} height={node.h} rx={10} fill={color} opacity={0.28} />
          {progress > 0 && progress < 1 && tip && <PenTip x={tip.x} y={tip.y} color={color} wiggle={progress} />}
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
          {node.type === 'arrow' && progress > 0.2 && <Arrowhead x1={node.x} y1={node.y} x2={x2} y2={y2} color={color} opacity={1} scale={(progress - 0.2) / 0.3} />}
          {progress > 0 && progress < 1 && <PenTip x={x2} y={y2} color={color} wiggle={progress} />}
        </g>
      );
    }
    case 'curve': {
      const tip = curvePoint(node.x, node.y, node.cx ?? node.x, node.cy ?? node.y, node.x2 ?? node.x, node.y2 ?? node.y, progress);
      return (
        <g transform={popTransform(progress, (node.x + (node.x2 ?? node.x)) / 2, (node.y + (node.y2 ?? node.y)) / 2)}>
          <path d={`M ${node.x} ${node.y} Q ${node.cx ?? node.x} ${node.cy ?? node.y} ${node.x2 ?? node.x} ${node.y2 ?? node.y}`} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
          {progress > 0 && progress < 1 && <PenTip x={tip.x} y={tip.y} color={color} wiggle={progress} />}
        </g>
      );
    }
    case 'path':
      return <PathNode node={node} progress={progress} color={color} />;
    case 'icon':
      return <IconNode node={node} progress={progress} rtl={rtl} />;
    case 'sticker':
      return <StickerNode node={node} progress={progress} />;
    default:
      return null;
  }
}

export type AskResult = { ok: true; step: LessonStep } | { ok: false; error: string };

export interface WhiteboardPlayerProps {
  lesson: WhiteboardLesson;
  /** When set, the learner can ask a question mid-lesson; the answer comes back as a validated branch step. */
  onAsk?: (question: string, ctx: { lesson: WhiteboardLesson; stepIndex: number; boardImage?: string }) => Promise<AskResult>;
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
  const [captions, setCaptions] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const step = lesson.steps[stepIndex];
  // Language is per step: a lesson can mix Arabic and English steps; the board direction, captions and voice follow the step.
  const stepLang: 'ar' | 'en' = step?.lang ?? lesson.lang;
  const isAr = stepLang === 'ar';
  const [voiceInfo, setVoiceInfo] = useState(() => getNarrationSupport(stepLang));
  const reduced = useMemo(prefersReducedMotion, []);
  const [voicePref, setVoicePref] = useState<VoicePreference>(() => { try { return loadVoicePreference(); } catch { return 'female'; } });
  const [ttsProvider, setTtsProvider] = useState<'munsit' | 'speechify'>(() => { try { return localStorage.getItem('wb-tts-provider') === 'speechify' ? 'speechify' : 'munsit'; } catch { return 'munsit'; } });
  const pickTtsProvider = (p: 'munsit' | 'speechify') => { setTtsProvider(p); try { localStorage.setItem('wb-tts-provider', p); } catch { /* private mode */ } };
  const [voiceId, setVoiceId] = useState<string>('');
  const [voiceList, setVoiceList] = useState<VoiceOption[]>([]);
  // Learner freehand layer: strokes live in board coordinates so they scale with the svg.
  const [drawMode, setDrawMode] = useState(false);
  // Try-it mode: before a step marked tryIt is revealed, pause so the learner attempts it on the draw layer.
  const [tryMode, setTryMode] = useState(false);
  const [tryPending, setTryPending] = useState<number | null>(null);
  const [drawColor, setDrawColor] = useState<NodeColor>('danger');
  const [strokes, setStrokes] = useState<FreehandStroke[]>([]);
  const activeStroke = useRef<FreehandStroke | null>(null);
  const [, forceStrokePaint] = useState(0);
  const resumeFromRef = useRef(0);
  const speechDoneRef = useRef(true);
  const stopSpeechRef = useRef<() => void>(() => undefined);

  const durations = useMemo(() => buildTimeline(lesson, rate), [lesson, rate]);
  const munsitTokenRef = useRef(0);
  const [munsitMs, setMunsitMs] = useState<number | null>(null);
  const baseDuration = durations.steps[stepIndex]?.durationMs ?? stepDurationMs(step, rate);
  const duration = munsitMs ? Math.max(baseDuration, munsitMs + 800) : baseDuration;
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

  const stopSpeech = useCallback(() => { munsitTokenRef.current += 1; stopSpeechRef.current(); stopSpeechRef.current = () => undefined; engine.cancel(); }, []);

  const startSpeech = useCallback((index: number, fromSentence = 0) => {
    stopSpeech();
    setMunsitMs(null);
    if (muted) { speechDoneRef.current = true; return; }
    const speakBrowser = () => {
      if (!voiceInfo.hasVoiceForLang) { speechDoneRef.current = true; return; }
      speechDoneRef.current = false;
      stopSpeechRef.current = engine.speak({
        text: lesson.steps[index].narration, lang: lesson.steps[index].lang ?? lesson.lang, rate,
        gender: genderForStep(voicePref, index), voiceId: voiceId || null, fromSentence,
        onEnd: () => { speechDoneRef.current = true; },
      });
    };
    const stepLangNow = lesson.steps[index].lang ?? lesson.lang;
    if (stepLangNow !== 'ar') { speakBrowser(); return; }
    // The Munsit teacher voice first (it also rescues devices with no Arabic voice); any failure falls back.
    const token = ++munsitTokenRef.current;
    speechDoneRef.current = false;
    const narration = lesson.steps[index].narration;
    const text = fromSentence > 0 ? splitSentences(narration).slice(fromSentence).join(' ') : narration;
    const gender = genderForStep(voicePref, index) === 'female' ? 'girl' : 'boy';
    void speakWithMunsit(lesson.id, text, gender, rate, () => { speechDoneRef.current = true; }, ms => setMunsitMs(ms), ttsProvider)
      .then(pb => {
        if (munsitTokenRef.current !== token) { pb?.stop(); return; }
        if (!pb) { speechDoneRef.current = true; speakBrowser(); return; }
        stopSpeechRef.current = () => pb.stop();
      });
  }, [lesson.steps, lesson.id, lesson.lang, muted, rate, stopSpeech, voiceInfo.hasVoiceForLang, voicePref, voiceId, ttsProvider]);

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
      const next = stepIndex + 1;
      if (tryMode && lesson.steps[next]?.tryIt) {
        setStepIndex(next); setTInStep(0); setPlaying(false); stopSpeech(); setTryPending(next); setDrawMode(true);
        return;
      }
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

  // Warm the teacher-voice clip for the current and next step so the voice starts
  // with the step (the fetch would otherwise land seconds into the drawing).
  useEffect(() => {
    if (muted) return;
    const warm = (i: number) => {
      const st = lesson.steps[i];
      if (!st || (st.lang ?? lesson.lang) !== 'ar') return;
      const gender = genderForStep(voicePref, i) === 'female' ? 'girl' : 'boy';
      prefetchMunsitClip(lesson.id, st.narration, gender, rate, ttsProvider);
    };
    warm(stepIndex);
    warm(stepIndex + 1);
  }, [lesson, stepIndex, muted, rate, voicePref, ttsProvider]);

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
    if (tryMode && lesson.steps[clamped]?.tryIt) {
      // Land hidden so the learner tries the step before the reveal.
      setPlaying(false);
      setTInStep(0);
      setTryPending(clamped);
      setDrawMode(true);
      return;
    }
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
    else if (e.key === 'm') { e.preventDefault(); setMuted(mv => !mv); }
    else if (e.key === 'c') { e.preventDefault(); setCaptions(cv => !cv); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomCenter(1.25); }
    else if (e.key === '-') { e.preventDefault(); zoomCenter(0.8); }
    else if (e.key === '0') { e.preventDefault(); resetView(); }
  };

  const pauseForQuestion = () => {
    if (!playing) return;
    resumeFromRef.current = sentenceAtProgress(splitSentences(step.narration), duration > 0 ? tInStep / duration : 0);
    setPlaying(false); stopSpeech(); spokenStepRef.current = null;
  };

  const ask = async (preset?: string) => {
    const q = (preset ?? question).trim();
    if (!onAsk || q.length < 2 || asking) return;
    pauseForQuestion();
    setAsking(true); setAskError(null);
    try {
      // The snapshot shows the model what the learner sees, including their own drawing.
      const boardImage = svgRef.current ? await captureBoardPng(svgRef.current, lesson.canvas).catch(() => undefined) : undefined;
      const res = await onAsk(q, { lesson, stepIndex, boardImage });
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

  // Voice questions: record a short clip, transcribe it worker-side (Whisper), then ask as usual.
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopVoiceQuestion = useCallback(() => { recorderRef.current?.stop(); }, []);
  const startVoiceQuestion = useCallback(async () => {
    if (recording || transcribing || asking) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setAskError(isAr ? 'الميكروفون غير متاح' : 'Microphone unavailable');
      return;
    }
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      recorderRef.current = null;
      setRecording(false);
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      if (blob.size < 400) return;
      setTranscribing(true);
      void requestLessonStt(blob)
        .then(res => {
          if (res.ok) { setQuestion(res.text); void ask(res.text); }
          else setAskError(isAr ? 'تعذّر فهم التسجيل، جرّب الكتابة' : 'Could not transcribe the recording, try typing');
        })
        .finally(() => setTranscribing(false));
    };
    recorderRef.current = rec;
    setRecording(true);
    rec.start();
    // Cap a question at 30 seconds.
    setTimeout(() => { if (recorderRef.current === rec) rec.stop(); }, 30_000);
  }, [recording, transcribing, asking, isAr, ask]);

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
    fitLabelsIntoBoxes(s.nodes).map((node, ni) => {
      const progress = idx < stepIndex || reduced
        ? 1
        : nodeProgress(s, ni, tInStep, duration);
      return <BoardNode key={`${s.id}-${node.id}`} node={node} progress={progress} rtl={isAr} />;
    });

  const svgRef = useRef<SVGSVGElement>(null);
  // Pan/zoom viewport: translate(x,y) scale(s) applied to one <g> around all board content.
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const panRef = useRef<Map<number, { x: number; y: number }> | null>(null);
  const MAX_ZOOM = 4;
  const clampView = useCallback((v: { s: number; x: number; y: number }) => {
    const s = Math.min(MAX_ZOOM, Math.max(1, v.s));
    const M = 160; // a little margin so the board edge can peek past the frame
    return {
      s,
      x: Math.min(M, Math.max(lesson.canvas.width - s * lesson.canvas.width - M, v.x)),
      y: Math.min(M, Math.max(lesson.canvas.height - s * lesson.canvas.height - M, v.y)),
    };
  }, [lesson.canvas.width, lesson.canvas.height]);
  const resetView = useCallback(() => setView({ s: 1, x: 0, y: 0 }), []);
  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setView(v0 => {
      const s2 = Math.min(MAX_ZOOM, Math.max(1, v0.s * factor));
      return clampView({ s: s2, x: px - (px - v0.x) * (s2 / v0.s), y: py - (py - v0.y) * (s2 / v0.s) });
    });
  }, [clampView]);
  const zoomCenter = useCallback((factor: number) => zoomAt(factor, lesson.canvas.width / 2, lesson.canvas.height / 2), [zoomAt, lesson.canvas]);
  // Wheel zoom needs a non-passive listener so the page does not scroll while zooming the board.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * lesson.canvas.width;
      const py = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * lesson.canvas.height;
      zoomAt(Math.exp(-ev.deltaY * 0.0015), px, py);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, lesson.canvas.width, lesson.canvas.height]);
  const toBoard = (e: React.PointerEvent): FreehandPoint => {
    const rect = svgRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 1, height: 1 };
    const raw = boardPoint(e.clientX, e.clientY, rect, lesson.canvas);
    const v = viewRef.current; // freehand points live in board space, so undo the viewport transform
    return { ...raw, x: (raw.x - v.x) / v.s, y: (raw.y - v.y) / v.s };
  };
  // Drag pans (one pointer) or pinch-zooms (two pointers) when draw mode is off.
  const onPanStart = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const pts = panRef.current ?? new Map<number, { x: number; y: number }>();
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    panRef.current = pts;
  };
  const onPanMove = (e: React.PointerEvent) => {
    const pts = panRef.current;
    if (!pts || !pts.has(e.pointerId)) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const kx = lesson.canvas.width / Math.max(1, rect.width);
    const ky = lesson.canvas.height / Math.max(1, rect.height);
    const prevPt = pts.get(e.pointerId)!;
    const before = [...pts.values()];
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setView(v0 => {
      let { s, x, y } = v0;
      if (before.length === 2) {
        const other = before[0] === prevPt ? before[1] : before[0];
        const curPt = pts.get(e.pointerId)!;
        const prevDist = Math.hypot(prevPt.x - other.x, prevPt.y - other.y);
        const curDist = Math.hypot(curPt.x - other.x, curPt.y - other.y);
        if (prevDist > 1 && curDist > 1) {
          const s2 = Math.min(MAX_ZOOM, Math.max(1, (s * curDist) / prevDist));
          const mx = (((curPt.x + other.x) / 2 - rect.left) * kx);
          const my = (((curPt.y + other.y) / 2 - rect.top) * ky);
          x = mx - (mx - x) * (s2 / s);
          y = my - (my - y) * (s2 / s);
          s = s2;
        }
      } else {
        x += (e.clientX - prevPt.x) * kx;
        y += (e.clientY - prevPt.y) * ky;
      }
      return clampView({ s, x, y });
    });
  };
  const onPanEnd = (e: React.PointerEvent) => {
    const pts = panRef.current;
    if (!pts) return;
    pts.delete(e.pointerId);
    if (pts.size === 0) panRef.current = null;
  };
  const onDrawStart = (e: React.PointerEvent) => {
    if (!drawMode) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    activeStroke.current = { id: `free-${Date.now()}-${Math.round(Math.random() * 1e6)}`, color: COLORS[drawColor], width: 6, points: [toBoard(e)] };
    forceStrokePaint(n => n + 1);
  };
  const onDrawMove = (e: React.PointerEvent) => {
    const cur = activeStroke.current;
    if (!drawMode || !cur) return;
    cur.points = appendPoint(cur.points, toBoard(e));
    forceStrokePaint(n => n + 1);
  };
  const onDrawEnd = () => {
    const cur = activeStroke.current;
    activeStroke.current = null;
    if (cur) setStrokes(prev => [...prev, cur]);
  };

  const caption = stripDiacritics(step.narration);
  const t = {
    play: isAr ? 'تشغيل' : 'Play',
    pause: isAr ? 'إيقاف مؤقت' : 'Pause',
    next: isAr ? 'الخطوة التالية' : 'Next step',
    prev: isAr ? 'الخطوة السابقة' : 'Previous step',
    mute: isAr ? 'كتم الصوت' : 'Mute',
    unmute: isAr ? 'تشغيل الصوت' : 'Unmute',
    captions: isAr ? 'النص المصاحب' : 'Captions',
    step: isAr ? 'الخطوة' : 'Step',
    draw: isAr ? 'ارسم على السبورة' : 'Draw on the board',
    zoomIn: isAr ? 'تكبير السبورة' : 'Zoom in',
    zoomOut: isAr ? 'تصغير السبورة' : 'Zoom out',
    resetView: isAr ? 'إعادة ضبط العرض' : 'Reset view',
    exportPdf: isAr ? 'تصدير الدرس PDF' : 'Export lesson PDF',
    stopDrawing: isAr ? 'إيقاف الرسم' : 'Stop drawing',
    clearDrawing: isAr ? 'امسح رسمي' : 'Clear my drawing',
    tryMode: isAr ? 'وضع جرّب بنفسك' : 'Try-it mode',
    reveal: isAr ? 'اعرض الخطوة' : 'Reveal the step',
  };

  return (
    <div className="space-y-3" dir={isAr ? 'rtl' : 'ltr'} onKeyDown={onKeyDown} tabIndex={0} aria-label={lesson.title} data-testid="whiteboard-player">
      {step.title && <div className="text-xs font-black text-teal-600" data-testid="whiteboard-step-title">{`${step.branch ? (isAr ? 'سؤالك: ' : 'Your question: ') : `${stepIndex + 1}. `}${step.title}`}</div>}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-[#fdfcf8]">
        <svg ref={svgRef} viewBox={`0 0 ${lesson.canvas.width} ${lesson.canvas.height}`} className={`w-full h-auto block touch-none${drawMode ? ' cursor-crosshair' : ' cursor-grab active:cursor-grabbing'}`} role="img" aria-label={step.title || lesson.title} style={{ fontFamily: "'Molhim', 'Aref Ruqaa', 'Cairo', serif" }}
          onPointerDown={drawMode ? onDrawStart : onPanStart} onPointerMove={drawMode ? onDrawMove : onPanMove} onPointerUp={drawMode ? onDrawEnd : onPanEnd} onPointerCancel={drawMode ? onDrawEnd : onPanEnd} onDoubleClick={resetView}>
          <defs>
            <pattern id="wb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e7e5df" strokeWidth="1" />
            </pattern>
          </defs>
          <g data-testid="board-viewport" transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
          <rect width={lesson.canvas.width} height={lesson.canvas.height} fill="url(#wb-grid)" />
          <g key={stepIndex}>
            {carriedSteps().map(cs => <g key={`carry-${cs.id}`}>{fitLabelsIntoBoxes(cs.nodes).map(n => <BoardNode key={`${cs.id}-${n.id}`} node={n} progress={1} rtl={(cs.lang ?? lesson.lang) === 'ar'} />)}</g>)}
            {renderStep(step, stepIndex)}
          </g>
          {tryPending === stepIndex && (
            <g data-testid="tryit-overlay">
              <rect x={240} y={500} width={800} height={150} rx={18} fill="#0f172a" opacity={0.88} />
              <text x={640} y={555} textAnchor="middle" fontSize={30} fontWeight={700} fill="#f8fafc" direction={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: 'inherit' }}>{(step.tryIt ?? '').length > 60 ? `${(step.tryIt ?? '').slice(0, 57)}…` : step.tryIt}</text>
              <text x={640} y={600} textAnchor="middle" fontSize={20} fill="#94a3b8" direction={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: 'inherit' }}>{isAr ? 'ارسم أو اكتب محاولتك على السبورة، ثم اعرض الخطوة' : 'Draw or write your attempt on the board, then reveal the step'}</text>
            </g>
          )}
          <g data-testid="freehand-layer" pointerEvents="none">
            {strokes.map(st => <path key={st.id} d={pointsToPath(st.points)} fill="none" stroke={st.color} strokeWidth={st.width} strokeLinecap="round" strokeLinejoin="round" />)}
            {activeStroke.current && <path d={pointsToPath(activeStroke.current.points)} fill="none" stroke={activeStroke.current.color} strokeWidth={activeStroke.current.width} strokeLinecap="round" strokeLinejoin="round" />}
          </g>
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
        {tryPending === stepIndex && (
          <button type="button" onClick={() => { setTryPending(null); setTInStep(0); spokenStepRef.current = null; resumeFromRef.current = 0; setPlaying(true); }} className="uipro-btn-tactile inline-flex items-center gap-2 text-white font-black text-sm px-4 py-2.5 rounded-xl" style={{ backgroundColor: COLORS.accent }}>
            {t.reveal}
          </button>
        )}
        <input type="range" min={0} max={lesson.steps.length - 1} value={stepIndex} onChange={e => goTo(Number(e.target.value))}
          className="flex-1 min-w-[120px] accent-[#007472]" aria-label={`${t.step} ${stepIndex + 1} / ${lesson.steps.length}`} />
        <span className="text-xs font-black text-slate-500 tabular-nums">{stepIndex + 1}/{lesson.steps.length}</span>
        <button type="button" onClick={() => { setTryMode(m => !m); setTryPending(null); }} aria-label={t.tryMode} aria-pressed={tryMode} className={`p-2.5 rounded-xl border ${tryMode ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700'}`}>
          <Target className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => setDrawMode(d => !d)} aria-label={drawMode ? t.stopDrawing : t.draw} aria-pressed={drawMode} className={`p-2.5 rounded-xl border ${drawMode ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700'}`}>
          <Pencil className="w-4 h-4" />
        </button>
        {drawMode && (['ink', 'primary', 'danger'] as NodeColor[]).map(c => (
          <button key={c} type="button" onClick={() => setDrawColor(c)} aria-label={`${t.draw}: ${c}`} aria-pressed={drawColor === c} className={`w-6 h-6 rounded-full border-2 ${drawColor === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`} style={{ backgroundColor: COLORS[c] }} />
        ))}
        {strokes.length > 0 && (
          <button type="button" onClick={() => setStrokes([])} aria-label={t.clearDrawing} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <select value={rate} onChange={e => setRate(Number(e.target.value))} aria-label={isAr ? 'السرعة' : 'Speed'} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-black px-2 py-2">
          {[0.75, 1, 1.25, 1.5].map(r => <option key={r} value={r}>{r}x</option>)}
        </select>
        <button type="button" onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={muted ? t.unmute : t.mute} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => zoomCenter(1.25)} aria-label={t.zoomIn} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <ZoomIn className="w-4 h-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => zoomCenter(0.8)} aria-label={t.zoomOut} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <ZoomOut className="w-4 h-4" aria-hidden="true" />
        </button>
        {(view.s !== 1 || view.x !== 0 || view.y !== 0) && (
          <button type="button" onClick={resetView} aria-label={t.resetView} className="p-2.5 rounded-xl border border-primary text-primary text-[10px] font-black inline-flex items-center gap-1" data-testid="reset-view">
            <Maximize className="w-4 h-4" aria-hidden="true" />{Math.round(view.s * 100)}%
          </button>
        )}
        <button type="button" onClick={() => { setExportingPdf(true); void exportLessonPdf(lesson).finally(() => setExportingPdf(false)); }} disabled={exportingPdf} aria-label={t.exportPdf} data-testid="export-pdf" className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40">
          {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FileDown className="w-4 h-4" aria-hidden="true" />}
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
        <div className="space-y-1.5" data-testid="whiteboard-ask">
          <div className="flex flex-wrap gap-1.5" data-testid="quick-questions">
            {(isAr
              ? [['أعد الشرح ببساطة', 'أعد شرح هذه الخطوة بطريقة أبسط'], ['مثال آخر', 'أعطني مثالًا آخر على هذه الخطوة'], ['لخّصها', 'لخص هذه الخطوة في نقاط سريعة']]
              : [['Explain simpler', 'Explain this step more simply'], ['Another example', 'Give me another example for this step'], ['Summarize', 'Summarize this step in quick points']]
            ).map(([label, q]) => (
              <button key={label} type="button" onClick={() => void ask(q)} disabled={asking}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary disabled:opacity-40">
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); void ask(); } }} maxLength={500}
              placeholder={isAr ? 'عندك سؤال؟ اكتبه وسأتوقف وأشرحه على نفس السبورة' : 'Have a question? Type it and I will pause and explain on this board'}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs" aria-label={isAr ? 'سؤال أثناء الدرس' : 'Question during the lesson'} />
            <button type="button" onClick={() => { if (recording) stopVoiceQuestion(); else void startVoiceQuestion(); }} disabled={asking || transcribing} aria-pressed={recording} data-testid="voice-question-mic"
              aria-label={isAr ? (recording ? 'إيقاف التسجيل' : 'اسأل بصوتك') : (recording ? 'Stop recording' : 'Ask by voice')}
              className={`p-2.5 rounded-xl border ${recording ? 'border-rose-500 bg-rose-500/10 text-rose-500 animate-pulse' : 'border-slate-200 dark:border-slate-700'} disabled:opacity-50`}>
              {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => void ask()} disabled={asking || question.trim().length < 2} aria-label={isAr ? 'أرسل السؤال' : 'Send question'} className="inline-flex items-center gap-1.5 bg-primary text-white font-black text-xs px-3 py-2.5 rounded-xl disabled:opacity-50">
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
        </select>
        <select value={ttsProvider} onChange={e => pickTtsProvider(e.target.value as 'munsit' | 'speechify')} aria-label={isAr ? 'محرك الصوت' : 'Voice engine'} data-testid="tts-provider-select"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-black px-2 py-2">
          <option value="munsit">Munsit</option>
          <option value="speechify">Speechify</option>
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
