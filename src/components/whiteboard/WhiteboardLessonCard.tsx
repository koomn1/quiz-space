import React, { useRef, useState } from 'react';
import { PenTool, Sparkles, Save, Loader2, AlertTriangle, Paperclip, X } from 'lucide-react';
import { SAMPLE_LESSONS } from '../../lib/whiteboard/sampleLessons';
import type { WhiteboardLesson } from '../../lib/whiteboard/lessonSchema';
import { loadSavedLessons, saveReviewedLesson, validateAiLesson, validateBranchStep } from '../../lib/whiteboard/lessonDrafts';
import { tashkeelDensity } from '../../lib/whiteboard/lessonSchema';
import { askWhiteboardQuestion, generateWhiteboardLesson, type LessonAttachment } from '../../services/aiWorkerClient';
import { canGenerateWhiteboardLesson } from '../../lib/whiteboard/access';
import WhiteboardPlayer, { type AskResult } from './WhiteboardPlayer';

export function WhiteboardLessonCard({ lang, isPremium, planName }: { lang: 'ar' | 'en'; isPremium?: boolean; planName?: string }) {
  const isAr = lang === 'ar';
  const canGenerate = canGenerateWhiteboardLesson(isPremium, planName);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<WhiteboardLesson[]>(() => { try { return loadSavedLessons(); } catch { return []; } });
  const [selectedId, setSelectedId] = useState(SAMPLE_LESSONS[0].id);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WhiteboardLesson | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [file, setFile] = useState<{ name: string; attachment: LessonAttachment } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const FILE_MAX = 10 * 1024 * 1024;
  const FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.txt';
  const pickFile = async (f: File) => {
    setError(null);
    if (f.size > FILE_MAX) { setError(isAr ? 'الملف أكبر من 10 ميجابايت.' : 'The file is larger than 10 MB.'); return; }
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(f);
    });
    const mimeType = f.type || (f.name.toLowerCase().endsWith('.txt') ? 'text/plain' : 'application/octet-stream');
    setFile({ name: f.name, attachment: { data, mimeType, name: f.name } });
  };

  const all = [...saved, ...SAMPLE_LESSONS.filter(s => !saved.some(l => l.id === s.id))];
  const lesson = draft ?? all.find(l => l.id === selectedId) ?? SAMPLE_LESSONS[0];

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true); setError(null);
    try {
      let lastProblems: string[] = [];
      // The model sometimes produces overlapping layouts or unknown node/icon names; the checker rejects those and we retry with the exact problems fed back.
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await generateWhiteboardLesson(topic.trim(), lang, 5, lastProblems.length ? lastProblems : undefined, file?.attachment);
        const checked = validateAiLesson(res.lesson, res.model);
        if (checked.ok && checked.lesson) {
          // The teacher voice needs diacritized narration; regenerate when the model skipped the tashkeel, but never fail the lesson on the last attempt.
          const weakTashkeel = checked.lesson.lang === 'ar'
            && checked.lesson.steps.some(st => tashkeelDensity(st.narration) < 0.15);
          if (weakTashkeel && attempt < 2) {
            lastProblems = ['اكتب narration بالتشكيل الكامل: ضع الحركات (فتحة، ضمة، كسرة، سكون، شدة، تنوين) على حروف كل جملة تقريبًا، مثل: «الشَّمْسُ نَجْمٌ يَدُورُ حَوْلَهُ كُلُّ شَيْءٍ». النصوص على السبورة تبقى بدون تشكيل.'];
            continue;
          }
          setDraft(checked.lesson);
          setWarnings(weakTashkeel ? [...checked.warnings, 'narration without full tashkeel'] : checked.warnings);
          return;
        }
        lastProblems = checked.errors;
      }
      setDraft(null);
      setError((isAr ? 'الدرس المُولَّد لم يجتز فحص التنسيق ولم يُعرض. جرّب موضوعًا آخر أو أعد المحاولة. ' : 'The generated lesson failed the layout check and was not shown. Try again or change the topic. ') + lastProblems.slice(0, 2).join(' '));
    } catch (e: any) {
      setError(e?.message || (isAr ? 'تعذر توليد الدرس.' : 'Could not generate the lesson.'));
    } finally { setBusy(false); }
  };

  const onAsk = async (question: string, ctx: { lesson: WhiteboardLesson; stepIndex: number; boardImage?: string }): Promise<AskResult> => {
    const cur = ctx.lesson.steps[ctx.stepIndex];
    // One retry when the answer fails validation or layout.
    let lastErrors: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await askWhiteboardQuestion({ question, lang: ctx.lesson.lang, lessonTitle: ctx.lesson.title, step: { title: cur.title, narration: cur.narration, nodes: cur.nodes }, ...(ctx.boardImage ? { boardImage: ctx.boardImage } : {}) });
      const checked = validateBranchStep(res.step, ctx.lesson, ctx.stepIndex);
      if (checked.ok && checked.step) return { ok: true, step: checked.step };
      lastErrors = checked.errors;
    }
    return { ok: false, error: (isAr ? 'تعذر تجهيز شرح مرتب لهذا السؤال، جرّب صياغة أخرى. ' : 'Could not build a clean explanation for that question, try rephrasing. ') + lastErrors.slice(0, 1).join(' ') };
  };

  const confirmAndSave = () => {
    if (!draft) return;
    const next = saveReviewedLesson(draft);
    setSaved(next); setSelectedId(draft.id); setDraft(null); setWarnings([]);
  };

  return (
    <section data-testid="whiteboard-lesson-card" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 cursor-pointer">
        <span className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-[#EE8361]/15 text-[#d9603b]"><PenTool className="w-5 h-5" /></span>
          <span>
            <span className="block font-display font-black text-base text-slate-900 dark:text-white">{isAr ? 'درس على السبورة' : 'Whiteboard lesson'}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isAr ? 'شاهد الشرح يُكتب ويُرسم خطوة بخطوة مع الصوت.' : 'Watch the explanation being written and drawn step by step, with voice.'}
            </span>
          </span>
        </span>
        <span className="text-xs font-black text-primary">{open ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'افتح' : 'Open')}</span>
      </button>
      {open && (
        <div className="space-y-3 pt-1">
          {canGenerate ? (
            <div className="flex flex-wrap items-center gap-2">
              <input value={topic} onChange={e => setTopic(e.target.value)} maxLength={400} placeholder={isAr ? 'اكتب موضوع الدرس (مثال: دورة الماء)' : 'Lesson topic (e.g. the water cycle)'}
                className="flex-1 min-w-[180px] rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs" aria-label={isAr ? 'موضوع الدرس' : 'Lesson topic'} />
              <button type="button" onClick={generate} disabled={busy || (topic.trim().length < 3 && !file)} className="uipro-btn-tactile inline-flex items-center gap-2 bg-primary text-white font-black text-xs px-4 py-2.5 rounded-xl disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{isAr ? 'ولّد درسًا بالذكاء الاصطناعي' : 'Generate with AI'}
              </button>
              <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} className="hidden" aria-hidden="true"
                onChange={e => { const f = e.target.files?.[0]; if (f) void pickFile(f); e.target.value = ''; }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} aria-label={isAr ? 'أرفق ملفًا للدرس' : 'Attach a lesson file'} data-testid="lesson-attach"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs font-black disabled:opacity-50">
                <Paperclip className="w-4 h-4" />{isAr ? 'من ملف' : 'From file'}
              </button>
              {file && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-2.5 py-1.5 text-[11px] font-black" data-testid="lesson-file-chip">
                  {file.name}
                  <button type="button" onClick={() => setFile(null)} aria-label={isAr ? 'أزل الملف' : 'Remove file'} className="hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}
            </div>
          ) : (
            <p data-testid="whiteboard-upgrade-note" className="flex items-center gap-2 text-xs rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2 font-bold">
              <Sparkles className="w-4 h-4 shrink-0" />{isAr ? 'توليد الدروس بالذكاء الاصطناعي متاح لمشتركي الباقة الذهبية والماسية فقط. الدرس التجريبي أدناه متاح للجميع.' : 'AI lesson generation is available on the Gold and Diamond plans only. The sample lesson below is open to everyone.'}
            </p>
          )}
          {error && <p role="alert" className="flex items-center gap-2 text-xs text-rose-500"><AlertTriangle className="w-4 h-4" />{error}</p>}

          {!draft && all.length > 1 && (
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-black px-3 py-2">
              {all.map(l => <option key={l.id} value={l.id}>{l.title}{l.metadata.source === 'ai' ? ' (AI)' : ''}</option>)}
            </select>
          )}
          {draft && (
            <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs space-y-2" data-testid="whiteboard-draft-banner">
              <p className="font-black text-amber-700 dark:text-amber-300">{isAr ? 'مسودة مولّدة بالذكاء الاصطناعي: راجع الشرح والرسوم قبل الاعتماد. قد تحتوي أخطاء في المعلومة أو التنسيق.' : 'AI-generated draft: review the explanation and drawings before approving. It may contain factual or layout mistakes.'}</p>
              {warnings.length > 0 && <ul className="list-disc ps-5 text-amber-700/80 dark:text-amber-200/80">{warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}</ul>}
              <div className="flex gap-2">
                <button type="button" onClick={confirmAndSave} className="inline-flex items-center gap-1.5 bg-primary text-white font-black px-3 py-2 rounded-xl"><Save className="w-4 h-4" />{isAr ? 'راجعته، احفظه على جهازي' : 'Reviewed, save on this device'}</button>
                <button type="button" onClick={() => { setDraft(null); setWarnings([]); }} className="border border-slate-300 dark:border-slate-600 font-black px-3 py-2 rounded-xl">{isAr ? 'تجاهل' : 'Discard'}</button>
              </div>
            </div>
          )}
          <h3 className="font-display font-black text-sm text-slate-900 dark:text-white">{lesson.title}</h3>
          <WhiteboardPlayer key={lesson.id + lesson.metadata.status} lesson={lesson} onAsk={canGenerate ? onAsk : undefined} />
        </div>
      )}
    </section>
  );
}

export default WhiteboardLessonCard;
