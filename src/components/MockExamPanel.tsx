import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCheck, Clock, Play, Printer, RotateCcw, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Quiz } from '../types';
import {
  ALL_SUBJECTS, UNCATEGORIZED, MockAnswers, MockExamQuestion, buildMockExam, buildPrintableExamHtml,
  clampCount, collectPool, defaultMinutes, formatClock, listSubjects, scoreMockExam,
} from '../lib/mockExam';

type Phase = 'setup' | 'running' | 'result';

const COUNT_CHOICES = [5, 10, 20, 30];

export function MockExamPanel({ quizzes, lang }: { quizzes: Quiz[]; lang: 'ar' | 'en' }) {
  const isAr = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [subject, setSubject] = useState<string>(ALL_SUBJECTS);
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(10);
  const [minutesTouched, setMinutesTouched] = useState(false);
  const [exam, setExam] = useState<MockExamQuestion[]>([]);
  const [answers, setAnswers] = useState<MockAnswers>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const finishedRef = useRef(false);

  const subjects = useMemo(() => listSubjects(quizzes), [quizzes]);
  const available = useMemo(() => collectPool(quizzes, subject).length, [quizzes, subject]);
  const effectiveCount = clampCount(count, available);
  const subjectLabel = (s: string) => (s === ALL_SUBJECTS ? (isAr ? 'كل المواد' : 'All subjects') : s === UNCATEGORIZED ? (isAr ? 'عام' : 'General') : s);

  useEffect(() => {
    if (!minutesTouched) setMinutes(defaultMinutes(effectiveCount));
  }, [effectiveCount, minutesTouched]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase('result');
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(id);
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const start = () => {
    const built = buildMockExam(quizzes, { subject, count: effectiveCount, minutes });
    if (built.length === 0) return;
    finishedRef.current = false;
    setExam(built);
    setAnswers({});
    setIndex(0);
    setSecondsLeft(Math.max(1, minutes) * 60);
    setPhase('running');
  };

  const reset = () => { setPhase('setup'); setExam([]); setAnswers({}); };

  const printExam = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildPrintableExamHtml(exam, isAr ? 'امتحان تجريبي' : 'Mock exam', isAr));
    w.document.close();
    w.focus();
    w.print();
  };

  const result = useMemo(() => scoreMockExam(exam, answers), [exam, answers]);
  const current = exam[index];
  const answeredCount = exam.filter(e => answers[e.key] !== undefined).length;
  const card = 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl';

  return (
    <section data-testid="mock-exam-panel" className={`${card} p-5 sm:p-6 space-y-4`} style={{ textAlign: isAr ? 'right' : 'left' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 cursor-pointer">
        <span className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-primary/10 text-primary"><ClipboardCheck className="w-5 h-5" /></span>
          <span>
            <span className="block font-display font-black text-base text-slate-900 dark:text-white">{isAr ? 'امتحان تجريبي' : 'Mock exam'}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isAr ? 'اختر مادة وعدد الأسئلة والوقت، ثم اختبر نفسك كأنه امتحان حقيقي.' : 'Pick a subject, size and time, then test yourself under exam conditions.'}
            </span>
          </span>
        </span>
        <span className="text-xs font-black text-primary">{open ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'ابدأ' : 'Open')}</span>
      </button>

      {open && phase === 'setup' && (
        <div className="space-y-4 pt-2">
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-500">{isAr ? 'لا توجد أسئلة عامة كافية بعد.' : 'Not enough public questions yet.'}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label={isAr ? 'المادة' : 'Subject'}>
                {[{ subject: ALL_SUBJECTS, questionCount: collectPool(quizzes, ALL_SUBJECTS).length }, ...subjects].map(s => (
                  <button key={s.subject} type="button" onClick={() => setSubject(s.subject)}
                    className={`uipro-pill-badge py-2 px-4 text-xs font-black cursor-pointer ${subject === s.subject ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {subjectLabel(s.subject)} <span className="opacity-70">({s.questionCount})</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{isAr ? 'عدد الأسئلة' : 'Questions'}</span>
                {COUNT_CHOICES.filter(c => c <= available).concat(available > 0 && !COUNT_CHOICES.includes(available) && available < 30 ? [available] : []).map(c => (
                  <button key={c} type="button" onClick={() => setCount(c)}
                    className={`px-3 py-1.5 rounded-xl border ${effectiveCount === c ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700'}`}>{c}</button>
                ))}
                <label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <input type="number" min={1} max={180} value={minutes}
                    onChange={e => { setMinutesTouched(true); setMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1))); }}
                    className="w-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-1 text-center" />
                  <span>{isAr ? 'دقيقة' : 'min'}</span>
                </label>
              </div>
              <button type="button" onClick={start} disabled={effectiveCount === 0}
                className="uipro-btn-tactile inline-flex items-center gap-2 bg-primary text-white font-black text-sm px-5 py-3 rounded-2xl disabled:opacity-50">
                <Play className="w-4 h-4" /> {isAr ? `ابدأ الامتحان (${effectiveCount} سؤال)` : `Start exam (${effectiveCount} questions)`}
              </button>
            </>
          )}
        </div>
      )}

      {open && phase === 'running' && current && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span>{isAr ? `سؤال ${index + 1} من ${exam.length}` : `Question ${index + 1} of ${exam.length}`}</span>
            <span className={`flex items-center gap-1.5 ${secondsLeft <= 60 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`} aria-live="off">
              <Clock className="w-4 h-4" /> {formatClock(secondsLeft)}
            </span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white leading-relaxed" dir="auto">{current.question.text}</p>
          <div className="grid gap-2">
            {current.question.options.map((opt, oi) => (
              <button key={oi} type="button" onClick={() => setAnswers(a => ({ ...a, [current.key]: oi }))}
                className={`text-start px-4 py-3 rounded-2xl border text-sm font-medium ${answers[current.key] === oi ? 'border-primary bg-primary/10 text-primary font-black' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`} dir="auto">
                {opt}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button type="button" disabled={index === 0} onClick={() => setIndex(i => i - 1)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40" aria-label={isAr ? 'السابق' : 'Previous'}>
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="text-xs text-slate-500">{answeredCount}/{exam.length} {isAr ? 'تمت الإجابة' : 'answered'}</span>
            {index < exam.length - 1 ? (
              <button type="button" onClick={() => setIndex(i => i + 1)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700" aria-label={isAr ? 'التالي' : 'Next'}>
                {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <button type="button" onClick={finish} className="uipro-btn-tactile bg-primary text-white font-black text-xs px-4 py-2.5 rounded-xl">{isAr ? 'إنهاء وتسليم' : 'Finish & submit'}</button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exam.map((e, i) => (
              <button key={e.key} type="button" onClick={() => setIndex(i)} aria-label={`${i + 1}`}
                className={`w-7 h-7 rounded-lg text-[11px] font-black border ${i === index ? 'border-primary text-primary' : answers[e.key] !== undefined ? 'bg-primary/15 border-primary/30' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>{i + 1}</button>
            ))}
          </div>
        </div>
      )}

      {open && phase === 'result' && (
        <div className="space-y-4 pt-2" data-testid="mock-exam-result">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black text-primary">{result.percent}%</div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-0.5">
              <div>{isAr ? `صحيحة: ${result.correct} من ${result.total}` : `Correct: ${result.correct} of ${result.total}`}</div>
              <div>{isAr ? `خاطئة: ${result.wrong} · بدون إجابة: ${result.unanswered}` : `Wrong: ${result.wrong} · Unanswered: ${result.unanswered}`}</div>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {exam.map((e, i) => {
              const picked = answers[e.key];
              const ok = picked === e.question.correctIndex;
              return (
                <div key={e.key} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1" dir="auto">
                  <div className="flex items-start gap-2 font-bold text-slate-800 dark:text-slate-100">
                    {ok ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    <span>{i + 1}. {e.question.text}</span>
                  </div>
                  {!ok && (
                    <div className="text-slate-500 dark:text-slate-400">
                      {isAr ? 'إجابتك: ' : 'Your answer: '}{picked === undefined ? (isAr ? 'لم تُجب' : 'none') : e.question.options[picked]}
                      {' · '}{isAr ? 'الصحيحة: ' : 'Correct: '}<b>{e.question.options[e.question.correctIndex]}</b>
                    </div>
                  )}
                  {e.question.explanation && <div className="text-slate-500 dark:text-slate-400">{e.question.explanation}</div>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={reset} className="uipro-btn-tactile inline-flex items-center gap-2 bg-primary text-white font-black text-xs px-4 py-2.5 rounded-xl"><RotateCcw className="w-4 h-4" />{isAr ? 'امتحان جديد' : 'New exam'}</button>
            <button type="button" onClick={printExam} className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 font-black text-xs px-4 py-2.5 rounded-xl"><Printer className="w-4 h-4" />{isAr ? 'طباعة نسخة ورقية' : 'Print paper copy'}</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default MockExamPanel;
