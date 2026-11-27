import React, { useState } from 'react';
import { PenTool } from 'lucide-react';
import { SAMPLE_LESSONS } from '../../lib/whiteboard/sampleLessons';
import WhiteboardPlayer from './WhiteboardPlayer';

export function WhiteboardLessonCard({ lang }: { lang: 'ar' | 'en' }) {
  const isAr = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const lesson = SAMPLE_LESSONS[index];
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
          {SAMPLE_LESSONS.length > 1 && (
            <select value={index} onChange={e => setIndex(Number(e.target.value))} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-black px-3 py-2">
              {SAMPLE_LESSONS.map((l, i) => <option key={l.id} value={i}>{l.title}</option>)}
            </select>
          )}
          <h3 className="font-display font-black text-sm text-slate-900 dark:text-white">{lesson.title}</h3>
          <WhiteboardPlayer key={lesson.id} lesson={lesson} />
        </div>
      )}
    </section>
  );
}

export default WhiteboardLessonCard;
