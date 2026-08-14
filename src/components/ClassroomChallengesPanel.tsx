import React from 'react';
import { CalendarClock, Plus, RefreshCw, Target, Trophy, UsersRound } from 'lucide-react';
import { claimLearningClassChallenge, createLearningClassChallenge, getLearningClassChallenges } from '../lib/db';
import type { LearningClassChallenge } from '../types';

type ClassroomChallengesPanelProps = {
  classId: string;
  canCreate: boolean;
  lang: 'ar' | 'en';
};

const copy = {
  ar: {
    title: 'تحديات الفصل التعاونية',
    subtitle: 'يتقدم الفصل بإنجاز الاختبارات داخل الفصل. يعرض النظام مساهمتك أنت فقط، لا درجات أو ترتيب زملائك.',
    create: 'إنشاء تحدٍ',
    creating: 'جاري الإنشاء…',
    titleLabel: 'اسم التحدي', description: 'وصف مختصر', target: 'عدد الاختبارات المطلوب', end: 'ينتهي في',
    empty: 'لا توجد تحديات نشطة في هذا الفصل حالياً.', refresh: 'تحديث', contribution: 'مساهماتك', reward: 'مكافأة الإنجاز', claim: 'استلم المكافأة', claimed: 'تم الاستلام', completed: 'اكتمل التحدي', remaining: 'متبقي',
    failure: 'تعذر إكمال العملية. راجع البيانات وحاول مرة أخرى.',
  },
  en: {
    title: 'Collaborative classroom challenges',
    subtitle: 'The classroom progresses through completed classroom quizzes. Only your own contribution is shown—never peers’ scores or ranks.',
    create: 'Create challenge', creating: 'Creating…',
    titleLabel: 'Challenge title', description: 'Short description', target: 'Quiz completion target', end: 'Ends at',
    empty: 'There are no active classroom challenges yet.', refresh: 'Refresh', contribution: 'Your contributions', reward: 'Completion reward', claim: 'Claim reward', claimed: 'Claimed', completed: 'Challenge completed', remaining: 'remaining',
    failure: 'The operation could not be completed. Check the details and try again.',
  },
} as const;

export default function ClassroomChallengesPanel({ classId, canCreate, lang }: ClassroomChallengesPanelProps) {
  const t = copy[lang];
  const [challenges, setChallenges] = React.useState<LearningClassChallenge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [target, setTarget] = React.useState(20);
  const [endsAt, setEndsAt] = React.useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setChallenges(await getLearningClassChallenges(classId)); setMessage(''); }
    catch { setMessage(t.failure); }
    finally { setLoading(false); }
  }, [classId, t.failure]);

  React.useEffect(() => { void load(); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true); setMessage('');
    const result = await createLearningClassChallenge(classId, title.trim(), description.trim(), target, new Date(endsAt).toISOString());
    setSaving(false);
    if (!result?.success) { setMessage(result?.message || t.failure); return; }
    setTitle(''); setDescription(''); setTarget(20); setFormOpen(false); await load();
  };

  const claim = async (id: string) => {
    setSaving(true); setMessage('');
    const result = await claimLearningClassChallenge(id);
    setSaving(false);
    if (!result?.claimed) { setMessage(result?.message || t.failure); return; }
    await load();
  };

  return <section className="space-y-5" aria-labelledby="class-challenges-title">
    <header className="flex flex-col gap-4 rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/50 via-slate-950/70 to-cyan-950/40 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Learning together</p><h3 id="class-challenges-title" className="mt-1 flex items-center gap-2 text-lg font-black text-white"><UsersRound className="h-5 w-5 text-cyan-300" aria-hidden="true" />{t.title}</h3><p className="mt-2 text-xs leading-6 text-slate-300">{t.subtitle}</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 text-xs font-black text-slate-100 hover:bg-slate-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />{t.refresh}</button>{canCreate && <button type="button" onClick={() => setFormOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-500 px-3 text-xs font-black text-slate-950 hover:bg-cyan-400"><Plus className="h-4 w-4" aria-hidden="true" />{t.create}</button>}</div>
    </header>

    {formOpen && canCreate && <form onSubmit={create} className="grid gap-3 rounded-3xl border border-cyan-500/25 bg-slate-900/70 p-5 md:grid-cols-2"><label className="text-xs font-bold text-slate-300">{t.titleLabel}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400" /></label><label className="text-xs font-bold text-slate-300">{t.target}<input type="number" value={target} min={3} max={500} onChange={(e) => setTarget(Number(e.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400" /></label><label className="text-xs font-bold text-slate-300 md:col-span-2">{t.description}<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} rows={2} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" /></label><label className="text-xs font-bold text-slate-300">{t.end}<input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400" /></label><div className="flex items-end"><button disabled={saving} className="min-h-11 rounded-xl bg-cyan-500 px-5 text-xs font-black text-slate-950 disabled:opacity-60">{saving ? t.creating : t.create}</button></div></form>}

    {message && <p role="alert" className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-200">{message}</p>}
    {loading ? <div className="flex min-h-32 items-center justify-center text-sm font-bold text-slate-400"><RefreshCw className="me-2 h-4 w-4 animate-spin" />{t.refresh}</div> : challenges.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/35 p-8 text-center text-sm font-bold text-slate-400">{t.empty}</div> : <div className="grid gap-4 lg:grid-cols-2">{challenges.map((challenge) => {
      const completed = Boolean(challenge.completedAt);
      const percent = Math.min(100, Math.round((challenge.currentCount / Math.max(1, challenge.targetCount)) * 100));
      const ending = challenge.endsAt ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(challenge.endsAt)) : '';
      return <article key={challenge.id} className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-black text-white">{challenge.title}</h4>{challenge.description && <p className="mt-2 text-xs leading-6 text-slate-400">{challenge.description}</p>}</div><span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${completed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-indigo-500/15 text-indigo-200'}`}>{completed ? t.completed : `${challenge.currentCount}/${challenge.targetCount}`}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${percent}%` }} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-950/70 p-2"><p className="text-[10px] text-slate-500">{t.contribution}</p><p className="mt-1 text-sm font-black text-white">{challenge.myContributions}</p></div><div className="rounded-xl bg-slate-950/70 p-2"><p className="text-[10px] text-slate-500">{t.remaining}</p><p className="mt-1 text-sm font-black text-white">{Math.max(0, challenge.targetCount - challenge.currentCount)}</p></div><div className="rounded-xl bg-slate-950/70 p-2"><p className="text-[10px] text-slate-500">{t.reward}</p><p className="mt-1 text-sm font-black text-amber-300">+{challenge.rewardPoints}</p></div></div><div className="mt-4 flex items-center justify-between gap-3"><span className="flex items-center gap-1 text-[11px] font-bold text-slate-400"><CalendarClock className="h-3.5 w-3.5" />{ending}</span>{completed && <button disabled={challenge.claimed || saving} type="button" onClick={() => void claim(challenge.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs font-black text-slate-950 disabled:opacity-50"><Trophy className="h-4 w-4" />{challenge.claimed ? t.claimed : t.claim}</button>}</div></article>;
    })}</div>}
  </section>;
}
