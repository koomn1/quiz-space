import React from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { getQuizErrorBank, resolveQuizErrorBankItem, QuizErrorBankItem } from '../lib/db';

interface ErrorBankProps { userId: string; isAr?: boolean; }

export default function ErrorBank({ userId, isAr = true }: ErrorBankProps) {
  const [items, setItems] = React.useState<QuizErrorBankItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeReview, setActiveReview] = React.useState(false);
  const [reviewIndex, setReviewIndex] = React.useState(0);
  const [reviewScore, setReviewScore] = React.useState(0);
  const [reviewAnswer, setReviewAnswer] = React.useState<number | null>(null);
  const [reviewFinished, setReviewFinished] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try { setItems(await getQuizErrorBank(userId)); } catch (error) { console.error('Error Bank load failed:', error); }
    finally { setLoading(false); }
  }, [userId]);
  React.useEffect(() => { load(); }, [load]);

  const startReview = () => { if (!items.length) return; setActiveReview(true); setReviewIndex(0); setReviewScore(0); setReviewAnswer(null); setReviewFinished(false); };
  const current = items[reviewIndex];
  const question = current?.question;
  const choose = (index: number) => {
    if (reviewAnswer !== null || !question) return;
    setReviewAnswer(index);
    if (index === question.correctIndex) setReviewScore((score) => score + 1);
  };
  const next = async () => {
    if (!current) return;
    if (reviewIndex + 1 >= items.length) { setReviewFinished(true); return; }
    setReviewIndex((index) => index + 1); setReviewAnswer(null);
  };
  const resolve = async (id: string) => { try { await resolveQuizErrorBankItem(id); setItems((prev) => prev.filter((item) => item.id !== id)); } catch (error) { console.error(error); } };

  if (activeReview && question && !reviewFinished) return (
    <section className="rounded-[2rem] border border-violet-400/30 bg-slate-950/90 p-6 text-white shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">{isAr ? 'جلسة مراجعة مركزة' : 'Focused Review'}</p><h3 className="mt-1 text-xl font-black">{isAr ? `السؤال ${reviewIndex + 1} من ${items.length}` : `Question ${reviewIndex + 1} of ${items.length}`}</h3></div><button onClick={() => setActiveReview(false)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">{isAr ? 'خروج' : 'Exit'}</button></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><h4 className="text-lg font-bold leading-8">{question.text}</h4><div className="mt-5 grid gap-3">{question.options.map((option, index) => <button key={option + index} onClick={() => choose(index)} className={`rounded-xl border p-4 text-start text-sm font-bold transition ${reviewAnswer === null ? 'border-white/10 bg-white/[.03] hover:border-violet-400 hover:bg-violet-500/10' : index === question.correctIndex ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : reviewAnswer === index ? 'border-rose-400 bg-rose-500/15 text-rose-200' : 'border-white/10 opacity-60'}`}>{option}</button>)}</div></div>
      {reviewAnswer !== null && <button onClick={next} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 font-black hover:bg-violet-500">{reviewIndex + 1 === items.length ? (isAr ? 'عرض النتيجة' : 'Show result') : (isAr ? 'السؤال التالي' : 'Next question')} <ChevronLeft className="h-4 w-4" /></button>}
    </section>
  );
  if (activeReview && reviewFinished) return <section className="rounded-[2rem] border border-emerald-400/30 bg-slate-950/90 p-8 text-center text-white shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}><Trophy className="mx-auto h-12 w-12 text-amber-300" /><h3 className="mt-4 text-2xl font-black">{isAr ? 'اكتملت جلسة المراجعة' : 'Review complete'}</h3><p className="mt-2 text-slate-300">{reviewScore} / {items.length}</p><button onClick={() => setActiveReview(false)} className="mt-6 rounded-xl bg-violet-600 px-6 py-3 font-black">{isAr ? 'العودة لبنك الأخطاء' : 'Back to Error Bank'}</button></section>;

  return <section className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}><div className="relative overflow-hidden rounded-[2rem] border border-violet-400/25 bg-gradient-to-br from-[#160b32] via-[#0b1029] to-[#08111f] p-6 text-white shadow-2xl"><div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" /><div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="mb-2 flex items-center gap-2 text-violet-300"><BrainCircuit className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.25em]">{isAr ? 'بنك الأخطاء الشخصي' : 'Personal Error Bank'}</span></div><h2 className="text-2xl font-black">{isAr ? 'حوّل أخطاءك إلى إتقان.' : 'Turn mistakes into mastery.'}</h2><p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">{isAr ? 'كل إجابة خاطئة محفوظة هنا تلقائياً لتراجعها في جلسة مركزة.' : 'Every incorrect answer is saved here for focused revision.'}</p></div><button disabled={!items.length} onClick={startReview} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black shadow-lg shadow-violet-900/30 disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className="h-4 w-4" />{isAr ? 'ابدأ مراجعة الأخطاء' : 'Start review'}</button></div></div>{loading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-violet-400" /></div> : !items.length ? <div className="rounded-2xl border border-dashed border-slate-300/20 bg-white/[.03] p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" /><p className="mt-3 font-black text-white">{isAr ? 'رائع، لا توجد أخطاء غير محلولة.' : 'Great, no unresolved errors.'}</p></div> : <div className="grid gap-4">{items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200/10 bg-slate-950/70 p-5 text-white shadow-xl"><div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-300" /><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-black text-amber-200">{isAr ? `تكرر ${item.mistake_count} مرة` : `${item.mistake_count} attempts`}</span><span className="text-[11px] text-slate-400">{item.quiz_title}</span></div><h3 className="font-bold leading-7">{item.question.text}</h3><div className="mt-3 grid gap-2 text-sm"><p className="rounded-lg bg-rose-500/10 p-2 text-rose-200"><b>{isAr ? 'إجابتك:' : 'Your answer:'}</b> {item.user_answer || (isAr ? 'بدون إجابة' : 'No answer')}</p><p className="rounded-lg bg-emerald-500/10 p-2 text-emerald-200"><b>{isAr ? 'الصحيح:' : 'Correct:'}</b> {item.correct_answer}</p></div><button onClick={() => resolve(item.id)} className="mt-4 flex items-center gap-2 text-xs font-black text-violet-300 hover:text-violet-200"><RotateCcw className="h-4 w-4" />{isAr ? 'تم إتقان السؤال' : 'Mark as mastered'}</button></div></div></article>)}</div>}</section>;
}
