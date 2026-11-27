import React, { useState } from 'react';
import { PenTool, Sparkles, Save, Loader2, AlertTriangle } from 'lucide-react';
import { SAMPLE_LESSONS } from '../../lib/whiteboard/sampleLessons';
import type { WhiteboardLesson } from '../../lib/whiteboard/lessonSchema';
import { loadSavedLessons, saveReviewedLesson, validateAiLesson } from '../../lib/whiteboard/lessonDrafts';
import { generateWhiteboardLesson } from '../../services/aiWorkerClient';
import { canGenerateWhiteboardLesson } from '../../lib/whiteboard/access';
import WhiteboardPlayer from './WhiteboardPlayer';

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

  const all = [...saved, ...SAMPLE_LESSONS.filter(s => !saved.some(l => l.id === s.id))];
  const lesson = draft ?? all.find(l => l.id === selectedId) ?? SAMPLE_LESSONS[0];

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true); setError(null);
    try {
      let lastProblems: string[] = [];
      // The model sometimes produces overlapping layouts; the checker rejects those and we ask once more.
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await generateWhiteboardLesson(topic.trim(), lang);
        const checked = validateAiLesson(res.lesson, res.model);
        if (checked.ok && checked.lesson) { setDraft(checked.lesson); setWarnings(checked.warnings); return; }
        lastProblems = checked.errors;
      }
      setDraft(null);
      setError((isAr ? 'الدرس المُولَّد لم يجتز فحص التنسيق ولم يُعرض. جرّب موضوعًا آخر أو أعد المحاولة. ' : 'The generated lesson failed the layout check and was not shown. Try again or change the topic. ') + lastProblems.slice(0, 2).join(' '));
    } catch (e: any) {
      setError(e?.message || (isAr ? 'تعذر توليد الدرس.' : 'Could not generate the lesson.'));
    } finally { setBusy(false); }
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
              <button type="button" onClick={generate} disabled={busy || topic.trim().length < 3} className="uipro-btn-tactile inline-flex items-center gap-2 bg-primary text-white font-black text-xs px-4 py-2.5 rounded-xl disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{isAr ? 'ولّد درسًا بالذكاء الاصطناعي' : 'Generate with AI'}
              </button>
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
          <WhiteboardPlayer key={lesson.id + lesson.metadata.status} lesson={lesson} />
        </div>
      )}
    </section>
  );
}

export default WhiteboardLessonCard;
